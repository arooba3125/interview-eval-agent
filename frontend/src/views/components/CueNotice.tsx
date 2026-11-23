/** The standing explanation of what delivery cues are and are not. */
export default function CueNotice() {
  return (
    <p className="cue-notice">
      These are observable communication cues measured from your audio{" "}
      <span className="nowrap">(and camera, if you allowed it).</span> They describe how the answer was delivered.
      They do not show confidence, nervousness, honesty or suitability for a job, and people speak well in many
      different styles.
    </p>
  );
}
