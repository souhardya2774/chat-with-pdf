"use server";

import { generateEmbeddingsinPinecone } from "@/lib/langchain";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export const generateEmbeddings= async (docId:string)=>{
    auth().protect();
    await generateEmbeddingsinPinecone(docId);
    revalidatePath("/dashboard");
    return {completed:true};
};