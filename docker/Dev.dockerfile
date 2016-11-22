FROM mhart/alpine-node:6.3

WORKDIR /package

# Install dependencies
RUN apk add --no-cache \
      build-base \
      py-pip \
      libc6-compat

# Install dependencies
ADD package.json /package/package.json
RUN npm install

# Add node_modules/.bin to PATH
ENV PATH "/package/node_modules/.bin:${PATH}"
