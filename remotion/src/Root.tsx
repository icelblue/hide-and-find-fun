import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";
import { SocialItemsVideo } from "./SocialItemsVideo";
import { SocialItemsVideoV2 } from "./SocialItemsVideoV2";

export const RemotionRoot = () => (
  <>
    <Composition
      id="main"
      component={MainVideo}
      durationInFrames={900}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="social-items"
      component={SocialItemsVideo}
      durationInFrames={420}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="social-items-v2"
      component={SocialItemsVideoV2}
      durationInFrames={552}
      fps={30}
      width={1080}
      height={1920}
    />
  </>
);
