.PHONY: docs

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

test: test-py test-js

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
