let cache = new Map();

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) =>
{
  let promise = cache.get(msg.keywords);
  if (!promise)
  {
    promise = fetch("https://www.google.com/search?tbm=isch&q=" +
                    encodeURIComponent(msg.keywords + " cats"))
      .then(response => response.text())
      .then(source =>
      {
        let parser = new DOMParser();
        let doc = parser.parseFromString(source, "text/html");
        let meta = doc.querySelector(".rg_meta");
        return [JSON.parse(meta.textContent).ou,
                doc.querySelector("#search img").src];
      });

    cache.set(msg.keywords, promise);
  }

  promise
    .then(urls => new Promise((resolve, reject) =>
    {
      let image = new Image();
      image.addEventListener("load", () =>
      {
        resolve(image);
      });
      image.addEventListener("error", () =>
      {
        let thumbnail = new Image();
        thumbnail.addEventListener("load", () =>
        {
          resolve(thumbnail);
        });
        thumbnail.addEventListener("error", reject);
        thumbnail.src = urls[1];
      });
      image.src = urls[0];
    }))
    .then(image =>
    {
      let {width, height} = msg;
      let ratio = image.width / image.height;
      if (ratio > width / height)
        height = width / ratio;
      else
        width = height * ratio;

      let canvas = document.createElement("canvas");
      canvas.width = msg.width;
      canvas.height = msg.height;
      canvas.getContext("2d").drawImage(
        image,
        0,
        0,
        image.width,
        image.height,
        (msg.width - width) / 2,
        (msg.height - height) / 2,
        width,
        height
      );

      return canvas.toDataURL("image/png");
    })
    .catch(() => null)
    .then(sendResponse);

  return true;
});
