import { Secp256k1KeyIdentity } from "@dfinity/identity";
import 'dotenv/config';

export const userPrincipals = JSON.parse(process.env.USER_PRINCIPALS) || [];

// Static principal for system use
// this is a randomly generated principal for reusability or testing only
// a2t6b-nznbt-igjd3-ut25i-b43cf-mt45v-g3x2g-ro6h5-kowno-dx3rz-uqe
const SystemIdentitySecretKeyBuf = [
  0, 168, 50, 238, 17, 21, 153, 17,
  114, 3, 198, 75, 230, 144, 104, 18,
  165 ,97, 192, 84, 1, 48, 161, 233,
  250, 142, 90, 243, 33, 243, 86, 2
];

export const systemPrincipal = (() => {
  const identity = Secp256k1KeyIdentity.fromSecretKey(SystemIdentitySecretKeyBuf);
  const principal = identity.getPrincipal().toString();

  return {
    identity,
    principal,
  };
})();