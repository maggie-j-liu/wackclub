import { serve } from "https://deno.land/std@0.138.0/http/server.ts";
import { HTMLRewriter } from "https://ghuc.cc/worker-tools/html-rewriter/index.ts";

serve(async (req) => {
  const pathname = new URL(req.url).pathname;
  // i think react hydrating reverts the changes :/ this breaks other stuff but oh well
  if (pathname.includes("/_next/static/chunks/framework")) {
    return new Response("", {
      headers: {
        "content-type": "application/javascript; charset=utf-8",
      },
    });
  }
  const content = await fetch(`https://hackclub.com/${pathname}`);
  let buffer = "";
  return new HTMLRewriter()
    .on("*", {
      text(text) {
        buffer += text.text;
        if (text.lastInTextNode) {
          buffer = buffer.replace(
            /(h|H)ack(\s|)(c|C)lub/g,
            (_match, h, space, c) => {
              const w = h === "h" ? "w" : "W";
              return `${w}ack${space}${c}lub`;
            }
          );
          buffer = buffer.replace(
            /\/_next\/image/g,
            "https://hackclub.com/_next/image"
          );
          buffer = buffer.replace(
            /assets\.wackclub\.com/g,
            "assets.hackclub.com"
          );
          text.replace(buffer, {
            html: true,
          });
          buffer = "";
        } else {
          text.remove();
        }
      },
    })
    .on("noscript", {
      element(element) {
        // for images that haven't loaded yet
        element.removeAndKeepContent();
      },
    })
    .on("img", {
      element(element) {
        const srcSet = element.getAttribute("srcset");
        if (!srcSet) {
          // for images that haven't loaded yet
          element.remove();
        } else {
          // for images that are already loaded
          const tokens = srcSet.split(" ");
          const newSrcSet = tokens
            .map((token) => {
              if (token.startsWith("/_next/image")) {
                return "https://hackclub.com" + token;
              }
              return token;
            })
            .join(" ");

          element.setAttribute("srcset", newSrcSet);
          const src = element.getAttribute("src");
          if (src?.startsWith("/_next/image")) {
            element.setAttribute("src", "https://hackclub.com" + src);
          }
        }
      },
    })
    .on("a", {
      element(element) {
        const href = element.getAttribute("href");
        if (href?.startsWith("https://hackclub.com")) {
          element.setAttribute(
            "href",
            href.replace("https://hackclub.com", "")
          );
        }
      },
    })
    .transform(content);
});
