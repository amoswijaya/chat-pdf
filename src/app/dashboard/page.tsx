import FileUpload from "@/components/FileUpload";
import { ResizablePanel } from "@/components/ui/resizable";

const DashboardPage = () => {
  return (
    <ResizablePanel
      defaultSize={85}
      minSize={60}
      className="h-full grid place-items-center"
    >
      <div className="flex flex-col gap-8 text-center max-w-[60rem] items-center container mx-auto">
        <h1 className="text-4xl font-bold">Chat with any PDF</h1>
        <p className="text-xl text-muted-foreground">
          Turn tedious pdf into dynamic conversations, Ask question, get instant
          summaries, and pinpoint information in seconds
        </p>
        <div className="p-2 border-2 border-neutral-300/60 rounded-3xl shadow-lg shadow-neutral-100/60 w-1/2 aspect-video ">
          <FileUpload />
        </div>
      </div>
    </ResizablePanel>
  );
};

export default DashboardPage;
