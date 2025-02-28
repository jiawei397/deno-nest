import type { Constructor } from "./interfaces/type.interface.ts";
import {
  getModuleMetadata,
  isDynamicModule,
  isGlobalModule,
  isModule,
} from "./decorators/module.ts";
import type {
  CollectResult,
  ModuleType,
} from "./interfaces/module.interface.ts";
import type {
  ClassProvider,
  ExistingProvider,
  FactoryProvider,
  Provider,
  SpecialProvider,
  ValueProvider,
} from "./interfaces/provider.interface.ts";

export function isSpecialProvider(
  provider: Provider | symbol,
): provider is SpecialProvider {
  if (typeof provider === "symbol") {
    return false;
  }
  return "provide" in provider;
}

export function isValueProvider(provider: Provider): provider is ValueProvider {
  return "useValue" in provider;
}

export function isFactoryProvider(
  provider: Provider,
): provider is FactoryProvider {
  return "useFactory" in provider;
}

export function isExistingProvider(
  provider: Provider,
): provider is ExistingProvider {
  return "useExisting" in provider;
}

export function isClassProvider(
  provider: Provider,
): provider is ClassProvider {
  return "useClass" in provider;
}

export async function collectModuleDeps(
  rootModule: ModuleType,
  moduleDepsMap: Map<ModuleType, CollectResult>,
): Promise<ModuleType | null> {
  if (!isModule(rootModule)) {
    return null;
  }
  const isDynamic = isDynamicModule(rootModule);
  const moduleKey = isDynamic ? rootModule.module : rootModule;
  let data = moduleDepsMap.get(moduleKey);
  if (!data) {
    data = {
      childModuleArr: [],
      controllerArr: [],
      providerArr: [],
      exportsArr: [],
      cache: new Map(),
      global: isGlobalModule(rootModule),
    }!;
    moduleDepsMap.set(moduleKey, data);
  }
  const {
    controllerArr,
    providerArr,
  } = data;
  const imports = isDynamic
    ? rootModule.imports
    : getModuleMetadata<ModuleType[]>("imports", rootModule);

  const controllers = isDynamic
    ? rootModule.controllers
    : getModuleMetadata<Constructor[]>("controllers", rootModule);
  const providers = isDynamic
    ? rootModule.providers
    : getModuleMetadata<Provider[]>("providers", rootModule);
  const exports = isDynamic
    ? rootModule.exports
    : getModuleMetadata<Provider[]>("exports", rootModule);
  if (controllers) {
    controllerArr.push(...controllers);
  }
  if (exports) {
    data.exportsArr.push(...exports);
  }
  if (providers) {
    const valueProviders = providers.filter(isValueProvider);
    const existingProviders = providers.filter(isExistingProvider);
    const classProviders = providers.filter((provider) =>
      isClassProvider(provider) || !isSpecialProvider(provider)
    );
    const factoryProviders = providers.filter(isFactoryProvider);
    providerArr.push(
      ...valueProviders,
      ...factoryProviders,
      ...classProviders,
      ...existingProviders,
    );
  }
  if (imports?.length) {
    for await (const item of imports) {
      const childModule = await collectModuleDeps(
        item,
        moduleDepsMap,
      );
      if (childModule) {
        data!.childModuleArr.push(childModule);
      }
    }
  }
  return moduleKey;
}

export function getChildModuleArr(
  moduleDepsMap: Map<ModuleType, CollectResult>,
  module: ModuleType,
): ModuleType[] {
  const data = moduleDepsMap.get(module);
  if (!data) {
    return [];
  }
  const { childModuleArr } = data;
  const arr = [...childModuleArr];
  childModuleArr.forEach((childModule) => {
    arr.push(...getChildModuleArr(moduleDepsMap, childModule));
  });
  return arr;
}

export function sortModuleDeps(moduleDepsMap: Map<ModuleType, CollectResult>) {
  const moduleDepsArr: ModuleType[] = [];
  for (const [module, { childModuleArr }] of moduleDepsMap) {
    childModuleArr.forEach((childModule) => {
      const children = getChildModuleArr(moduleDepsMap, childModule);
      moduleDepsArr.push(...children.reverse(), childModule);
    });
    moduleDepsArr.push(module);
    break;
  }
  return [...new Set(moduleDepsArr)];
}
