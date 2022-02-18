packer {
  required_plugins {
    googlecompute = {
      version = ">= 0.0.1"
      source = "github.com/hashicorp/googlecompute"
    }
  }
}

source "googlecompute" "infra-instruqt" {
  project_id = "nr-devadv-labs"
  source_image_family = "ubuntu-2004-lts"
  ssh_username = "packer"
  zone = "us-central1-a"
  image_name = "infra-v2-instruqt"
}

build {
  sources = ["sources.googlecompute.infra-instruqt"]

  provisioner "shell" {
    scripts = [
        "./scripts/install-dependencies.sh",
        "./scripts/set-up-service.sh",
    ]
  }
}
