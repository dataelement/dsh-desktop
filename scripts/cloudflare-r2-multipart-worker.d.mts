declare const worker: {
  fetch(request: Request, env: {
    RELEASE_UPLOAD_TOKEN: string
    RELEASE_VERSION: string
    SHERLOCK_RELEASES: {
      createMultipartUpload(key: string, options?: unknown): Promise<{ uploadId: string }>
      resumeMultipartUpload?(key: string, uploadId: string): unknown
    }
  }): Promise<Response>
}

export default worker
