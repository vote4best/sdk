import { ethers } from "ethers";

/**
 * Ethers.js returns a proxy object of mixed arrays and objects. This proxy breaks when using hardcopy.
 * Im still in progress of solving this issue. For now, this function is a workaround that converts the proxy to a deep copy.
 * it might produce unexpected results still.
 * @param object The object to convert.
 * @returns The converted object.
 */
export const deepArrayToObject = <T>(object: T) => {
  if (typeof object == "string") return object;
  let result = Array.isArray(object) ? [] : {};
  Object.keys(object).forEach((key) => {
    if (typeof object[key] === "string")
      result[key] = (" " + object[key]).slice(1);
    else if (typeof object[key] === "number") result[key] = Number(object[key]);
    else if (typeof object[key] === "boolean")
      result[key] = Boolean(object[key]);
    else if (object[key] === null) result[key] = null;
    else if (object[key] === undefined) result[key] = undefined;
    else if (object[key]?._isBigNumber)
      result[key] = ethers.BigNumber.from(
        (" " + object[key].toString()).slice(1)
      );
    else result[key] = deepArrayToObject(object[key]);
  });
  return result as T;
};
