.PHONY: docs requirements

env:
	pip install virtualenv && \
	virtualenv venv && \
	. venv/bin/activate && \
	make deps

deps:
	pip install -r requirements/dev.txt
	pip install -r requirements/test.txt
	npm install

clean:
	find . -name '*.pyc' -exec rm -f {} \;
	find . -name '*.pyo' -exec rm -f {} \;
	find . -name '*~' -exec rm -f {} \;
	rm -rf bower_components node_modules

test: test-py test-js extract

test-py:
	DJANGO_SETTINGS_MODULE=settings.test python manage.py test

test-py-debug:
	DJANGO_SETTINGS_MODULE=settings.test python manage.py test -s

test-js:
	node_modules/karma/bin/karma start karma.conf.js --single-run

webdriver:
	node_modules/protractor/bin/webdriver-manager start

test-acceptance:
	node_modules/protractor/bin/protractor protractor.conf.js

tdd:
	node_modules/karma/bin/karma start karma.conf.js

workbench:
	@echo "Updating the database..."
	DJANGO_SETTINGS_MODULE=settings.dev python manage.py syncdb --migrate -v 0
	@echo "Starting server..."
	DJANGO_SETTINGS_MODULE=settings.dev python manage.py runserver_plus

release:
	pandoc --from=markdown --to=rst README.md -o README.rst
	python setup.py bdist_egg upload
	python setup.py sdist upload
	rm README.rst

extract:
	find ubcpi/ -iname "*.py" ! -path "ubcpi/test/*" | xargs xgettext --from-code=UTF-8 --default-domain=py --language=Python --force-po --output-dir=build --omit-header
	node_modules/.bin/angular-gettext-cli --files './ubcpi/static/**/*.+(js|html)' --exclude '**/*_(spec|steps).js' --dest 'build/static.po'
	msgcat build/static.po build/py.po > build/text.po
	msgmerge --update ubcpi/translations/en/LC_MESSAGES/text.po build/text.po

compile:
	for i in `find ubcpi/translations/ -name *.po`; do msgfmt $$i -o `dirname $$i`/text.mo; done
	node_modules/.bin/angular-gettext-cli --compile --files 'ubcpi/translations/**/*.po' --format javascript --dest 'ubcpi/static/js/src/translations.js'

pull_translations:
	tx pull --force --mode=reviewed -l=ar,es_419,ja_JP,fr,fr_CA,he,hi,ko_KR,pt_BR,pt_PT,ru,zh_CN,de_DE,pl
	make compile

push_translations:
	make extract
	tx push -s
