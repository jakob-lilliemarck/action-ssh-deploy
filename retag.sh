#!/usr/bin/env bash

set -e

retag() {
  if [ ! $# -eq 1 ]; then
    echo "Incorrect amount of arguments"
    return 1
  fi

  VERSION=v1

  # 1 TAG
  # 2 MESSAGE
  ncc build src/index.ts
  git add .
  git push --delete origin $VERSION
  git tag -d $VERSION
  git commit -m "$1"
  git tag -a $VERSION -m "$1"
  git push --follow-tags
}

retag "$1"
