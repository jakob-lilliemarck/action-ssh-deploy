# ssh deploy
Connect and deploy code over ssh.

```yml
name: SSH & SFTP deploy

on:
  push:
    branches:
      - main

jobs:
 main:
    runs-on: ubuntu-latest
    steps:
      - run: |
          mkdir files
          echo "test-1" > ./files/test-1.txt
          echo "test-2" > ./files/test-2.txt
          ls -R

      - uses: jakob-lilliemarck/action-ssh-deploy@v1
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          passphrase: ${{ secrets.PASSWORD }}
          privateKey: ${{ secrets.PRIVATE_KEY }}
          files: |
            files
            source=files/test-2.txt,target=test-2.txt
```