import React from "react";
import { AbsoluteFill, Composition, registerRoot, useCurrentFrame } from "remotion";

const Shot: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: "#0B1020" }}>
      <div
        style={{
          position: "absolute",
          left: 40 + frame * 8,
          top: 100,
          width: 240,
          height: 160,
          backgroundColor: "#FFC21A",
        }}
      />
    </AbsoluteFill>
  );
};

const Root: React.FC = () => (
  <Composition id="Shot169" component={Shot} fps={30} width={640} height={360} durationInFrames={120} />
);

registerRoot(Root);
