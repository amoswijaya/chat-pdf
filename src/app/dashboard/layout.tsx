"use client";
import { ResizablePanelGroup } from "@/components/ui/resizable";
import { useMediaQuery } from "@/hooks/use-media-query";
import ChatBar from "./_commponents/ChatBar";

const LayoutDashboard = ({ children }: { children: React.ReactNode }) => {
  const isMobile = useMediaQuery("(max-width: 640px)");
  return (
    <div className=" mt-16 flex h-[calc(100vh-4rem)]">
      <ResizablePanelGroup direction={isMobile ? "vertical" : "horizontal"}>
        <ChatBar />
        {children}
      </ResizablePanelGroup>
    </div>
  );
};
export default LayoutDashboard;
