import Header from "@/components/Header";
import { ClerkLoaded } from "@clerk/nextjs";

function layout({ children }:{children: React.ReactNode}) {
  return (
    <ClerkLoaded>
      <div className="flex-1 flex flex-col h-screen">
        <Header/>
        <main className="flex-1 overflow-y-scroll">
          {children}
        </main>
      </div>
    </ClerkLoaded>
  );
}

export default layout;