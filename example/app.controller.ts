import { Controller, Get, getReadableStream, Header, HeaderJSON } from "../mod.ts";
import { UserService } from "./user/services/user.service.ts";

@Controller("")
export class AppController {
  constructor(private readonly userService: UserService) {}
  @Get("/", {
    alias: "/v1/version", // this will make an extra route
  })
  version() {
    console.log(this.userService.info());
    return "0.0.1";
  }

  /**
   * response an stream, can test by `curl http://localhost:2000/api/stream`
   */
  @Get("/stream")
  stream() {
    const { body, write, end } = getReadableStream();
    let num = 0;
    const timer = setInterval(() => {
      if (num === 100) {
        clearInterval(timer);
        console.info("end");
        try {
          end("Task successfully end");
        } catch (error) {
          console.error("end", error); // TypeError: The stream controller cannot close or enqueue
        }
        return;
      }
      num++;
      const message = `It is ${new Date().toISOString()}\n`;
      console.log(message);
      try {
        write(message);
      } catch (error) {
        console.error("write", error); // TypeError: The stream controller cannot close or enqueue
        clearInterval(timer);
      }
    }, 1000);
    return body;
  }

  @Get("/v2/test", {
    isAbsolute: true,
  })
  @Header("a", "b")
  @Header("c", "d")
  @HeaderJSON()
  test() {
    return true;
  }
}
