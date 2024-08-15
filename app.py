import streamlit as st
from streamlit.web import cli as stcli
import streamlit.web.bootstrap as bootstrap
from streamlit.web.server import Server
import os

def run():
    dirname = os.path.dirname(__file__)
    filename = os.path.join(dirname, 'build/index.html')
    Server.get_current()._static_file_handler.serve_file(filename)

if __name__ == '__main__':
    if stcli._is_running_with_streamlit():
        run()
    else:
        bootstrap.run(run, '', [], {})