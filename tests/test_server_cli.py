import unittest
import logging

from unittest import mock as mock
from unittest.mock import MagicMock, patch, Mock
from pathlib import Path
from io import BytesIO
from click.testing import CliRunner
import contextlib
from io import StringIO

from vantage6.cli.globals import APPNAME
from vantage6.common import STRING_ENCODING
from docker.errors import APIError

from vantage6.cli.server import (
    cli_server_start,
    cli_server_configuration_list,
    cli_server_files,
    cli_server_import,
    cli_server_new,
    cli_server_stop
)


class NodeCLITest(unittest.TestCase):

    @patch("docker.types.Mount")
    @patch("os.makedirs")
    @patch("vantage6.cli.server.pull_if_newer")
    @patch("vantage6.cli.server.ServerContext")
    @patch("docker.DockerClient.containers")
    @patch("vantage6.cli.server.check_if_docker_deamon_is_running")
    def test_list_docker_not_running(self, docker_check, containers, context,
                                     pull, os_makedirs, mount):
        """Start server without errors"""

        docker_check.return_value = True

        container1 = MagicMock()
        container1.name = f"{APPNAME}-iknl-user"
        containers.list.return_value = [container1]
        containers.run.return_value = True

        context.config_exists.return_value = True
        context.return_value = MagicMock(
            name="not-running",
            config={
                'uri': 'sqlite:///file.db',
                'port': 9999
            },
            config_file="/config.yaml",
            data_dir=Path(".")
        )

        runner = CliRunner()
        result = runner.invoke(cli_server_start, ["--name", "not-running"])

        self.assertEqual(result.exit_code, 0)
