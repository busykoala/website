.PHONY: install build sync deploy

install:
	yarn install

build:
	yarn build

sync:
	aws s3 cp dist/index.html s3://busykoala.io/index.html
	aws s3 cp favicon.ico s3://busykoala.io/favicon.ico
	aws s3 cp dist/assets/ s3://busykoala.io/assets/ --recursive

deploy:
	$(MAKE) install
	$(MAKE) build
	$(MAKE) sync
