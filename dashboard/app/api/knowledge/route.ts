import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chunkText } from "@/lib/chunker";
import OpenAI from "openai";
import { Pinecone } from "@pinecone-database/pinecone";

const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME || "knowledge-base";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("knowledge_files")
      .select("id, file_name, file_size, created_at, embedding_status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ files: data ?? [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large (max 10MB)" },
        { status: 400 }
      );
    }

    // Read file content as text
    const content = await file.text();

    // Store file in Supabase Storage
    const storagePath = `${user.id}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("knowledge-files")
      .upload(storagePath, file, {
        contentType: file.type || "text/plain",
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
    }

    // Insert metadata + extracted text
    const { data, error } = await supabase
      .from("knowledge_files")
      .insert({
        user_id: user.id,
        file_name: file.name,
        storage_path: storagePath,
        content_text: content.slice(0, 100000),
        file_size: file.size,
        embedding_status: "pending",
      })
      .select("id, file_name, file_size, created_at, embedding_status")
      .single();

    if (error) throw error;

    // --- Vector embedding pipeline (non-blocking for the response) ---
    if (PINECONE_API_KEY && OPENAI_API_KEY) {
      try {
        await supabase
          .from("knowledge_files")
          .update({ embedding_status: "processing" })
          .eq("id", data.id);

        const chunks = chunkText(content);

        if (chunks.length > 0) {
          // Generate embeddings
          const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
          const embeddingResponse = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: chunks.map((c) => c.text),
          });

          // Upsert to Pinecone
          const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
          const index = pinecone.Index(PINECONE_INDEX_NAME);
          const namespace = index.namespace(user.id);

          const vectors = embeddingResponse.data.map((emb, i) => ({
            id: `${data.id}-${i}`,
            values: emb.embedding,
            metadata: {
              document_id: data.id,
              chunk_index: chunks[i].index,
              chunk_text: chunks[i].text,
              file_name: file.name,
              user_id: user.id,
            },
          }));

          // Pinecone upsert in batches of 100
          for (let i = 0; i < vectors.length; i += 100) {
            await namespace.upsert({ records: vectors.slice(i, i + 100) } as any);
          }

          // Store chunk metadata in Supabase
          const chunkRows = chunks.map((chunk, i) => ({
            knowledge_file_id: data.id,
            user_id: user.id,
            chunk_index: chunk.index,
            chunk_text: chunk.text,
            pinecone_vector_id: `${data.id}-${i}`,
            token_count: Math.ceil(chunk.text.length / 4),
          }));

          await supabase.from("knowledge_chunks").insert(chunkRows);
        }

        await supabase
          .from("knowledge_files")
          .update({ embedding_status: "completed" })
          .eq("id", data.id);

        data.embedding_status = "completed";
      } catch (embError: any) {
        console.error("Embedding pipeline error:", embError);
        await supabase
          .from("knowledge_files")
          .update({ embedding_status: "failed" })
          .eq("id", data.id);
        data.embedding_status = "failed";
      }
    }

    return NextResponse.json({ file: data });
  } catch (error: any) {
    console.error("Knowledge upload error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing file ID" },
        { status: 400 }
      );
    }

    // Get storage path and chunk IDs before deleting
    const { data: file } = await supabase
      .from("knowledge_files")
      .select("storage_path")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    // Delete vectors from Pinecone
    if (PINECONE_API_KEY) {
      try {
        const { data: chunks } = await supabase
          .from("knowledge_chunks")
          .select("pinecone_vector_id")
          .eq("knowledge_file_id", id);

        if (chunks && chunks.length > 0) {
          const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
          const index = pinecone.Index(PINECONE_INDEX_NAME);
          const namespace = index.namespace(user.id);
          const vectorIds = chunks
            .map((c) => c.pinecone_vector_id)
            .filter(Boolean);
          if (vectorIds.length > 0) {
            await namespace.deleteMany(vectorIds);
          }
        }
      } catch (pcError: any) {
        console.error("Pinecone cleanup error:", pcError);
      }
    }

    // Delete from storage
    if (file?.storage_path) {
      await supabase.storage
        .from("knowledge-files")
        .remove([file.storage_path]);
    }

    // Delete from DB (knowledge_chunks cascade-deletes)
    const { error } = await supabase
      .from("knowledge_files")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
