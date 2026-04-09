import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";
import { SocialItemsVideo } from "./SocialItemsVideo";

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
  </>
);
