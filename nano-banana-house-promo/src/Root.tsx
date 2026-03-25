import { Composition, Still, Folder } from "remotion";
import { HouseRemodel } from "./HouseRemodel";
import { HouseRemodelStill } from "./HouseRemodelStill";

// Total video duration:
// 90 + 120 + 120 + 90 + 90 = 510 frames
// Minus transitions: 15 + 20 + 15 + 20 = 70 frames
// Net: 440 frames @ 30fps ≈ 14.7 seconds
const VIDEO_DURATION = 440;

export const RemotionRoot = () => {
  return (
    <Folder name="NanoBanana">
      {/* Full promo video - 1080x1080 for social media */}
      <Composition
        id="HouseRemodel"
        component={HouseRemodel}
        durationInFrames={VIDEO_DURATION}
        fps={30}
        width={1080}
        height={1080}
      />

      {/* 16:9 version for YouTube / web */}
      <Composition
        id="HouseRemodel-16x9"
        component={HouseRemodel}
        durationInFrames={VIDEO_DURATION}
        fps={30}
        width={1920}
        height={1080}
      />

      {/* 9:16 vertical for Stories / Reels / TikTok */}
      <Composition
        id="HouseRemodel-9x16"
        component={HouseRemodel}
        durationInFrames={VIDEO_DURATION}
        fps={30}
        width={1080}
        height={1920}
      />

      {/* Static promotional image */}
      <Still
        id="HouseRemodelStill"
        component={HouseRemodelStill}
        width={1080}
        height={1080}
      />

      {/* High-res still for print */}
      <Still
        id="HouseRemodelStill-Print"
        component={HouseRemodelStill}
        width={2400}
        height={2400}
      />
    </Folder>
  );
};
