import { fileRouter } from "../index";
export = new fileRouter.Path("/").http("GET", "/stats", (http) =>
  http.onRequest((ctr) => {
    ctr.print("ye we got stats");
  })
);
