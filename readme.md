# Gallica
A CLI to fetch photos and maps from BNF Gallica website.

```
(sudo) npm install -g git+https://github.com/jonathanlurie/gallica.git
```

Then, you need the `ark` ID of the document you want to fetch. You can usually find this ID in the URL.  
In a terminal:
```
gallica --ark btv1b531213318 --save /somepath/image.jpg
```

It it possible that the document contains more than one image or page, then it is going to be saved as `image.0.jpg`, `image.1.jpg`, `image.n.jpg`. Plus a metadata file will be written under the name `image.json`.