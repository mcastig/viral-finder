import type { OutlierVideo } from "@/lib/types";
import { VideoCard } from "@/components/VideoCard/VideoCard";
import "./VideoGrid.css";

interface VideoGridProps {
  videos: OutlierVideo[];
}

export function VideoGrid({ videos }: VideoGridProps) {
  return (
    <div className="video-grid">
      {videos.map((video) => (
        <VideoCard key={video.id} video={video} />
      ))}
    </div>
  );
}
