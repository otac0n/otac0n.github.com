FROM jekyll/jekyll:pages
RUN gem install webrick
WORKDIR /srv/jekyll
