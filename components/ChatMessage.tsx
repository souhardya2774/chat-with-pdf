import Image from 'next/image';
import { Message } from './Chat';
import { useUser } from '@clerk/nextjs';
import { BotIcon, Loader2Icon } from 'lucide-react';
import Markdown from "react-markdown";


function ChatMessage({message}:{
    message: Message
}) {
    const isHuman= (message.role === "human");
    const { user }=useUser();

  return (
    <div className={`chat ${isHuman?"chat-end":"chat-start"}`}>
        <div className='chat-image avatar'>
            <div className='w-10 rounded-full'>
                {
                    isHuman ?(
                        user?.imageUrl && (
                            <Image
                            src={user?.imageUrl}
                            alt='Profle Picture'
                            width={40}
                            height={40}
                            className='rounded-full'
                            />
                        )
                    ):(
                        <div className='h-10 w-10 bg-indigo-600 flex justify-center items-center'>
                            <BotIcon className='text-white h-7 w-7'/>
                        </div>
                    )
                }
            </div>
        </div>

        <div className={`chat-bubble prose ${isHuman && "bg-indigo-600 text-white"}`}>
            {
                message.message === "Thinking..."?(
                    <div className="flex justify-center items-center">
                        <Loader2Icon className="h-5 w-5 animate-spin text-white"/>
                    </div>
                ):(
                    <Markdown>{message.message}</Markdown>
                )
            }
        </div>
    </div>
  );
}

export default ChatMessage;