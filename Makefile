.PHONY: install build sync deploy

install:
	yarn install

build:
	yarn build

sync:
	aws s3 cp index.html s3://busykoala.io/index.html
	aws s3 cp style.css s3://busykoala.io/style.css
	aws s3 cp dist/shell-bundle.js s3://busykoala.io/dist/shell-bundle.js

deploy:
	$(MAKE) install
	$(MAKE) build
	$(MAKE) sync
