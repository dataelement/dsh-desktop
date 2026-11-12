# Apple Developer ID G2 intermediate

`developer-id-g2.pem` is the public Developer ID Certification Authority (G2) certificate published at https://www.apple.com/certificateauthority/DeveloperIDG2CA.cer. It contains no private signing key.

The DER SHA-256 is `f16cd3c54c7f83cea4bf1a3e6a0819c8aaa8e4a1528fd144715f350643d2df3a`, unchanged from the existing signing script. The PEM was recovered from the public copy at https://github.com/ctxrs/ctx/blob/main/scripts/apple-developer-id-g2-ca.pem while the Apple endpoint returned HTTP 403, and its DER bytes were checked against that pre-existing pinned digest before inclusion. Its validity is 2021-09-22 through 2031-09-17.

The signing helper tries Apple first, then reads this checkout-relative file if the remote source is unavailable or fails its checksum. Both paths verify the same fixed DER SHA-256 before writing a temporary import file. To rotate this certificate, review the new Apple certificate and fingerprint together and update the pinned digest and tests; do not accept the downloaded checksum or disable verification automatically.
