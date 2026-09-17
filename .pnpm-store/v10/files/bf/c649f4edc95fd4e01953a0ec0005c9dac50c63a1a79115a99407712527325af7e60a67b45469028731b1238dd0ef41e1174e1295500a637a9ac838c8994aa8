function handleResponse(body, status = 200, headers = {}, response) {
  if (body === null) {
    return false;
  }
  headers["content-length"] = body.length.toString();
  response.writeHead(status, headers).end(body);
  return true;
}
export {
  handleResponse
};
