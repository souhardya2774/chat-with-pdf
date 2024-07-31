"use client";

import { useUser } from "@clerk/nextjs";
import { FormEvent, useEffect, useRef, useState, useTransition } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Loader2Icon } from "lucide-react";
import { collection, doc, orderBy, query } from "firebase/firestore";
import { db } from "@/firebase";
import { useCollection } from 'react-firebase-hooks/firestore';
import { askQuestion } from "@/actions/askQuestion";
import ChatMessage from "./ChatMessage";

export type Message={
    id?:string;
    role: "human" | "ai" | "placeholder";
    message: string;
    createdAt: Date;
};

function Chat({id}:{
    id:string
}) {
    const { user }= useUser();
    const [input, setInput]= useState("");
    const [isPending, startTransition]= useTransition();
    const [messages,setMessage]= useState<Message[]>([]);
    const bottomOfChatRef= useRef<HTMLDivElement>(null);

    const [snapshot, loading, error]= useCollection(
        user &&
        query(
            collection(db,"users",user?.id,"files",id,"chat"),
            orderBy("createdAt","asc")
        )
    );

    useEffect(()=>{
        bottomOfChatRef.current?.scrollIntoView({
            behavior: "smooth"
        });
    },[messages]);

    useEffect(()=>{
        if(!snapshot)return;

        const lastMessage=messages.pop();

        if(lastMessage?.role==="ai" && lastMessage.message==="Thinking..."){
            return;
        }

        const newMessages=snapshot.docs.map((doc)=>{
            const { role, message, createdAt }= doc.data();

            return {
                id: doc.id,
                role,
                message,
                createdAt
            };
        });

        setMessage(newMessages);
    },[snapshot]);

    function handleSubmit(event: FormEvent<HTMLFormElement>): void {
        event.preventDefault();

        const q=input;
        setInput("");
        setMessage((prev)=>[
            ...prev,
            {
                role: "human",
                message: q,
                createdAt: new Date()
            },{
                role: "ai",
                message: "Thinking...",
                createdAt: new Date()
            }
        ]);

        startTransition(async()=>{
            const { success, message}=await askQuestion(id,q);
            
            if(!success){
                setMessage((prev)=>
                    prev.slice(0,prev.length-1).concat([
                        {
                            role: "ai",
                            message: `Whoops... ${message}`,
                            createdAt: new Date()
                        }
                    ])
                );
            }

            
        });
    }

  return (
    <div className="flex flex-col h-full overflow-scroll">
        <div className="flex-1 w-full">
            {loading?(
                <div className="flex justify-center items-center">
                    <Loader2Icon className="h-20 w-20 animate-spin text-indigo-600"/>
                </div>
            ):(
                <div className="p-5">
                    {
                        messages.length===0 &&
                        (
                            <ChatMessage key="placeholder" message={{
                                role: "ai",
                                message: "Ask me anything about the document!",
                                createdAt:new Date()
                            }}/>
                        )
                    }
                    {messages.map((message,index)=>(
                        <ChatMessage key={index} message={message}/>
                    ))}

                    <div ref={bottomOfChatRef}/>
                </div>
            )}
        </div>
        <form
        onSubmit={handleSubmit}
        className="flex sticky bottom-0 space-x-2 p-5 bg-indigo-600/75"
        >
            <Input
            placeholder="Ask a Question..."
            value={input}
            onChange={(e)=>setInput(e.target.value)}
            />
            <Button
            type="submit"
            disabled={!input || isPending}
            >{
                isPending?(
                    <Loader2Icon className="animate-spin text-indigo-600"/>
                ):("Ask")
            }</Button>
        </form>
    </div>
  );
}

export default Chat;