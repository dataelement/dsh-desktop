function handleResponse(body, status = 200, headers = {}) {
  if (body !== null) {
    headers["content-length"] = body.length.toString();
  }
  return new Response(body, {
    status,
    headers
  });
}
export {
  handleResponse
};
