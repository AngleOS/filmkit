// A stand-in for the pinned HyperFrames package: the rules it can report, written each way the real one writes them.
export const rules = [{ code: "missing_data_no_timeline" }, { code: "sweep_static" }, { code: "gsap_infinite_repeat" }, { code: "motion_frozen" }];
const runtime=e=>e?{code:"runtime_script_error",category:"script-error"}:null;
const findingAtRoot = (code, message) => ({ code, message });
export const spec = findingAtRoot("motion_spec_invalid", "the sidecar isn't valid JSON");
export const zone = { code: "caption_zone_collision", runtime };
