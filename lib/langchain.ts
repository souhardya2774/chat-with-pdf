import { ChatCohere } from "@langchain/cohere";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { createRetrievalChain } from "langchain/chains/retrieval";
import { createHistoryAwareRetriever } from "langchain/chains/history_aware_retriever";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import pc from "./pinecone";
import { PineconeStore } from "@langchain/pinecone";
import { PineconeConflictError } from "@pinecone-database/pinecone/dist/errors";
import { Index, RecordMetadata } from "@pinecone-database/pinecone";
import { adminDB } from "@/firebaseAdmin";
import { auth } from "@clerk/nextjs/server";
 

const model = new ChatCohere({
    model: "command-r"
});

export const indexName="chat-with-pdf";

async function generateDoc(docId: string) {
    const {userId}=await auth();
    if(!userId){
        throw new Error("User not found!");
    }
    const firebaseRef=await adminDB.collection("users").doc(userId).collection("files").doc(docId).get();

    const downloadLink= firebaseRef.data()?.downloadUrl;
    if(!downloadLink){
        throw new Error("Download URL not found!");
    }
    const response= await fetch(downloadLink);
    const data=await response.blob();

    const loader=new PDFLoader(data);
    const doc=await loader.load();

    const spliter=new RecursiveCharacterTextSplitter();

    const splitDocs=await spliter.splitDocuments(doc);

    return splitDocs;
}

const nameSpaceExits=async (index:Index<RecordMetadata>,nameSpace:string)=>{
    if(nameSpace===null)throw new Error("No namespace value provided!");
    const {namespaces}= await index.describeIndexStats();
    return namespaces?.[nameSpace] !==undefined;
}

export async function generateEmbeddingsinPinecone(docId:string) {
    const { userId }= await auth();
    if(!userId){
        throw new Error("User not found!");
    }

    console.log("Generating Embeddings...");
    const embeddings = new HuggingFaceInferenceEmbeddings({
        model: "sentence-transformers/all-mpnet-base-v2",
        apiKey: process.env.HUGGINGFACEHUB_API_KEY
      });

    const index=await pc.index(indexName);
    const nameSpaceAlreadyExists=await nameSpaceExits(index,docId);

    if(nameSpaceAlreadyExists){
        const pineconeVectorStore=await PineconeStore.fromExistingIndex(embeddings,{
            pineconeIndex: index,
            namespace: docId
        });
        return pineconeVectorStore;
    }else{
        const splitDocs=await generateDoc(docId);

        // Store in pinecone namespace docId
        const pineconeVectorStore=await PineconeStore.fromDocuments(
            splitDocs,
            embeddings,{
                pineconeIndex: index,
                namespace: docId
            });

        return pineconeVectorStore;
    }
}

export async function fetchMessageFromDB(docId: string) {
    const { userId }=await auth();
    if(!userId){
        throw new Error("User not found!");
    }

    const chats=await adminDB
    .collection("users")
    .doc(userId)
    .collection("files")
    .doc(docId)
    .collection("chat")
    .orderBy("createdAt","desc")
    .get();

    const chatHistory= chats.docs.map(
        (doc)=>(doc.data().role==="human")
        ? new HumanMessage(doc.data().message)
        :new AIMessage(doc.data().message)
    );

    return chatHistory;
}

export async function generateLangchainCompletion (docId:string, question:string) {
    const pineconeVectorStore=await generateEmbeddingsinPinecone(docId);

    if(!pineconeVectorStore){
        throw new Error("Pinecone vector store not found!");
    }

    const retriever= pineconeVectorStore.asRetriever();

    const chatHistory= await fetchMessageFromDB(docId);

    const historyAwarePrompt= ChatPromptTemplate.fromMessages([
        ...chatHistory,
        ["user","{input}"],
        [
            "user",
            "Given the above conversation, generate a search query to look up in order to get information relavent to the conversation."
        ]
    ]);

    const historyAwareRetrieverChain=await createHistoryAwareRetriever({
        llm: model,
        retriever,
        rephrasePrompt: historyAwarePrompt
    });

    const historyAwareRetrivalPrompt= ChatPromptTemplate.fromMessages([
        [
            "system",
            "Answer the user's questions based on the below context:\n\n{context}"
        ],
        ...chatHistory,
        ["user","{input}"]
    ]);

    const historyAwareCombineDocsChain=await createStuffDocumentsChain({
        llm: model,
        prompt: historyAwareRetrivalPrompt
    });

    const conversationalRetrievalChain=await createRetrievalChain({
        retriever: historyAwareRetrieverChain,
        combineDocsChain: historyAwareCombineDocsChain
    });

    const replay=await conversationalRetrievalChain.invoke({
        chat_history: chatHistory,
        input: question
    });

    return replay.answer;
}