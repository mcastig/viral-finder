import type { OutlierVideo } from "@/lib/types";
import {
  formatViews,
  formatCount,
  formatFactor,
  formatRelativeDate,
} from "@/lib/format";
import "./VideoCard.css";

interface VideoCardProps {
  video: OutlierVideo;
}

export function VideoCard({ video }: VideoCardProps) {
  const watchUrl = `https://www.youtube.com/watch?v=${video.youtubeId}`;

  return (
    <article className="video-card">
      <a
        className="video-card__thumb"
        href={watchUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        {/* External YouTube thumbnails; plain <img> keeps the MVP free of
            next/image remote-domain config. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="video-card__image"
          src={video.thumbnailUrl}
          alt={video.title}
          loading="lazy"
        />
        <span className="video-card__badge">
          {formatFactor(video.outlierFactor)} more views!
        </span>
      </a>

      <div className="video-card__body">
        <h3 className="video-card__title">
          <a
            href={watchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="video-card__title-link"
          >
            {video.title}
          </a>
        </h3>

        <div className="video-card__channel-row">
          <a
            className="video-card__channel"
            href={video.channelUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {video.channelName}
          </a>
          <span className="video-card__subs">
            {video.channelSubscribers === null
              ? "Subscribers hidden"
              : `${formatCount(video.channelSubscribers)} subscribers`}
          </span>
        </div>

        <dl className="video-card__stats">
          <div className="video-card__stat">
            <dt className="video-card__stat-label">Views</dt>
            <dd className="video-card__stat-value">
              {formatViews(video.currentViews)}
            </dd>
          </div>
          <div className="video-card__stat">
            <dt className="video-card__stat-label">Channel avg</dt>
            <dd className="video-card__stat-value">
              {formatViews(video.channelAvgViews)}
            </dd>
          </div>
          <div className="video-card__stat">
            <dt className="video-card__stat-label">Published</dt>
            <dd className="video-card__stat-value">
              {formatRelativeDate(video.publishedAt)}
            </dd>
          </div>
        </dl>
      </div>
    </article>
  );
}
