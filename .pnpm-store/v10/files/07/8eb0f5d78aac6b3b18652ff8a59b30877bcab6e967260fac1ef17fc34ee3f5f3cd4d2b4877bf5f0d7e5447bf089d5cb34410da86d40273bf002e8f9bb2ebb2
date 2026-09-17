import { concatUint8Array } from "../../concat-uint8array.js";
const textDecoder = new TextDecoder("utf-8", { fatal: false });
const decode = textDecoder.decode.bind(textDecoder);
async function getPayload(request) {
  if (typeof request.body === "object" && "rawBody" in request && request.rawBody instanceof Uint8Array) {
    return decode(request.rawBody);
  } else if (typeof request.body === "string") {
    return request.body;
  }
  const payload = await getPayloadFromRequestStream(request);
  return decode(payload);
}
function getPayloadFromRequestStream(request) {
  return new Promise((resolve, reject) => {
    let data = [];
    request.on(
      "error",
      (error) => reject(new AggregateError([error], error.message))
    );
    request.on("data", data.push.bind(data));
    request.on("end", () => {
      const result = concatUint8Array(data);
      queueMicrotask(() => resolve(result));
    });
  });
}
export {
  getPayload,
  getPayloadFromRequestStream
};
