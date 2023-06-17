const Crawler = require("crawler");
const fs = require("fs");
const sites = require("./sites.json");

const loadPerInstance = 1000;
const instanceNumber = 18;

const handleReport = async (sites) => {
  return new Promise((resolve, reject) => {
    const wordCount = {};
    const errorSites = [];
    const c = new Crawler({
      rateLimit: 3000,
      callback: (error, res, done) => {
        if (!res.request) {
          return done();
        }
        console.log("inside crawler::", res.request.uri.href);
        wordCount[res.request.uri.href] = 0;
        if (error) {
          console.log(error);
          errorSites.push({
            url: res.request.uri.href,
            error,
          });
        } else {
          const $ = res.$;
          if ($ === undefined) {
            return done();
          }

          const findText = (node) => {
            try {
              if (
                node.tagName !== "script" &&
                node.tagName !== "style" &&
                node.tagName !== "noscript" &&
                node.tagName !== "svg"
              ) {
                if (node.nodeType === 3 && node.nodeValue.trim() !== "") {
                  const words = node.nodeValue.split(" ");
                  words.forEach((word) => {
                    if (word !== "") {
                      wordCount[res.request.uri.href] += 1;
                    }
                  });
                }
                const children = node.childNodes;
                if (children !== null) {
                  for (let i = 0; i < children.length; i++) {
                    findText(children[i]);
                  }
                }
              }
            } catch (error) {
              console.log("error", error);
              errorSites.push({
                url: res.request.uri.href,
                error,
              });
            }
          };

          try {
            const children = $("body").children();
            for (let i = 0; i < children.length; i++) {
              findText(children[i]);
            }
          } catch (error) {
            console.log("error", error);
            errorSites.push({
              url: res.request.uri.href,
              error,
            });
          }
        }
        console.log("done");
        done();
      },
    });

    c.on("drain", () => {
      console.log("drain");
      console.log("wordCount::", wordCount);
      return resolve({
        wordCount,
        errorSites,
      });
    });

    sites.forEach((site) => {
      c.queue({
        uri: site,
      });
    });
  });
};

(async () => {
  const rangeStart = (instanceNumber - 1) * loadPerInstance;
  const rangeEnd = instanceNumber * loadPerInstance;
  console.log("instanceNumber::", instanceNumber);
  console.log("loadPerInstance::", loadPerInstance);
  console.log("rangeStart::", rangeStart);
  console.log("rangeEnd::", rangeEnd);
  console.log("sites::", sites.length);
  const { wordCount, errorSites } = await handleReport(
    sites.slice(rangeStart, rangeEnd)
  );
  fs.writeFileSync(`./count${instanceNumber}.json`, JSON.stringify(wordCount));
  fs.writeFileSync(
    `./errorSites${instanceNumber}.json`,
    JSON.stringify(errorSites)
  );
})();
