import { DynamicModule, Module } from "@nest/core";
import { ConfigService } from "./config.service.ts";
import { ConfigOptions, EnvConfig } from "./config.interface.ts";
import { CONFIG_KEY } from "./config.constant.ts";
import { load } from "@std/dotenv";
import { join } from "@std/path/join";

@Module({})
export class ConfigModule {
  static register(options: ConfigOptions): DynamicModule {
    return {
      module: ConfigModule,
      providers: [
        {
          provide: CONFIG_KEY,
          useFactory: async () => {
            const folder = options.folder;
            const filePath = `${Deno.env.get("DENO_ENV") || "development"}.env`;
            return await load({
              envPath: join(folder, filePath),
            }) as EnvConfig;
          },
        },
        ConfigService,
      ],
      exports: [ConfigService],
      global: true,
    };
  }
}
