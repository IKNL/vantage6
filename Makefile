# `make` is expected to be called from the directory that contains
# this Makefile

TAG ?= latest

rebuild: clean build-dist

build-dist:
	# Increase the build number
	python inc-build.py vantage6/cli/__build__

	# Build the PyPI package
	python setup.py sdist bdist_wheel

publish-test:
	# Uploading to test.pypi.org
	twine upload --repository testpypi dist/*

publish:
	# Uploading to pypi.org
	twine upload --repository pypi dist/*

clean:
	# Cleaning ...
	-rm -r build
	-rm dist/*

test:
	coverage run --source=vantage6 --omit="utest.py" ./utest.py