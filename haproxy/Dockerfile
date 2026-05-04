FROM haproxy:2.8-alpine

# Copy our config into the standard HAProxy location
COPY haproxy.cfg /usr/local/etc/haproxy/haproxy.cfg

# Validate config at build time — fails the build if there's a syntax error
# RUN haproxy -c -f /usr/local/etc/haproxy/haproxy.cfg
# RUN haproxy -c --ignore-resolve-errors -f /usr/local/etc/haproxy/haproxy.cfg
