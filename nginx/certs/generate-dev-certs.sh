#!/bin/bash
# Generate self-signed certificates for development

set -e

CERT_DIR="$(dirname "$0")"
cd "$CERT_DIR"

# Certificate details
COUNTRY="US"
STATE="California"
LOCALITY="San Francisco"
ORGANIZATION="Manufacturing Analytics Platform"
ORGANIZATIONAL_UNIT="Development"
COMMON_NAME="localhost"
EMAIL="admin@manufacturing.local"

# Generate private key
echo "Generating private key..."
openssl genrsa -out server.key 4096

# Generate certificate signing request
echo "Generating CSR..."
openssl req -new -key server.key -out server.csr -subj "/C=$COUNTRY/ST=$STATE/L=$LOCALITY/O=$ORGANIZATION/OU=$ORGANIZATIONAL_UNIT/CN=$COMMON_NAME/emailAddress=$EMAIL"

# Create extensions file for SAN (Subject Alternative Names)
cat > v3.ext <<EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = *.localhost
DNS.3 = manufacturing.local
DNS.4 = *.manufacturing.local
DNS.5 = grafana.manufacturing.local
DNS.6 = nextjs
DNS.7 = grafana
DNS.8 = nginx
IP.1 = 127.0.0.1
IP.2 = ::1
IP.3 = 172.16.0.1
IP.4 = 10.0.0.1
EOF

# Generate self-signed certificate
echo "Generating self-signed certificate..."
openssl x509 -req -in server.csr -signkey server.key -out server.crt -days 365 -sha256 -extfile v3.ext

# Generate Diffie-Hellman parameters for enhanced security
echo "Generating DH parameters (this may take a while)..."
openssl dhparam -out dhparam.pem 2048

# Clean up
rm server.csr v3.ext

# Set appropriate permissions
chmod 600 server.key
chmod 644 server.crt
chmod 644 dhparam.pem

echo "✅ Development certificates generated successfully!"
echo ""
echo "Certificate files:"
echo "  - server.crt: Certificate file"
echo "  - server.key: Private key file"
echo "  - dhparam.pem: DH parameters"
echo ""
echo "⚠️  These are self-signed certificates for development only!"
echo "    Browsers will show a security warning."
echo ""
echo "To trust the certificate locally (optional):"
echo "  - Windows: Import server.crt to 'Trusted Root Certification Authorities'"
echo "  - macOS: Add to Keychain and trust for SSL"
echo "  - Linux: Copy to /usr/local/share/ca-certificates/ and run update-ca-certificates"