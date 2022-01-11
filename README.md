# Infrastructure V2 lab environment

This repository contains the packer templates, scripts, and files for building the materials for New Relic's infrastructure v2 lab.

## Build the Google Cloud image

Build a new image from inside the root directory:

```bash
packer build -f .
```

## Service files

This lab uses flask applications. These services are kept in the _files_ directory and used by cloning and referencing the remote repository. Therefore, when you make changes to the flask files, push the changes to the remote repo before rebuilding the image.
