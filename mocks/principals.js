import { Secp256k1KeyIdentity } from "@dfinity/identity";

export const fleekPrincipals = [
  "7siti-rd3jp-gvepz-zzcu5-66zg6-hsfnm-bxpmg-cramr-th4re-esfgf-uae",
  "nschj-65eff-fjwa2-wqxcu-75dc4-3u23q-hes6j-ji57j-7tvxt-yrxhh-qae",
  "rpsin-ncc5o-ii4m4-wgjpr-wbpuo-kw53g-lpqk2-cknkc-bktyp-33sxu-6qe",
  "j63dc-rpowz-5pt7o-nah2l-z33hc-yacyk-ep3kc-fcxsp-evlxc-p3rv5-2qe",
  "uhf5k-iodso-pb3a5-rteha-gqxay-es5ds-eqcjr-cli24-3bazl-y646l-dqe",
  "vqx5j-tup4w-jq2qz-5itsl-5jon6-rrqtq-75o6n-5qvob-umjvb-po6pf-pqe",
  "hjkza-2mvdg-a4qz7-dluke-hhbdk-q4cg4-drdid-a4th4-iwj75-erhdm-iae",
  "qmj6v-zfpwv-dxbyc-loybi-ztex6-xack2-4spf3-2llaa-xo3sb-5xlwf-nae",
  "ozyrt-7ryer-tdaw4-qbtdi-3kg74-vwlzx-vzvfk-jp2nq-eqorg-6upbt-lae",
  "yoqz7-rprox-oygiz-bz5yy-lwswa-cnho7-hpxoe-qg7m2-go2kk-n7y77-7ae",
  "6vj5p-imd5n-7gtwg-fskuc-bvuqy-65j54-xxdqw-gxikv-rkw4u-ocrmb-dqe",
  "gbreb-dz5av-b6ckd-5eeag-qnxqs-shbbf-i72nn-4hik2-3kjc5-a2usp-rqe",
  "lkqmh-5vihe-t5x5j-smuot-vitei-tgfyx-losfh-bbud4-fp2rq-353dj-yqe",
  "wwcl3-afeq7-24k7y-udtx2-hnmv4-id6fl-qickd-rk6xo-k5azw-xeq3q-7qe",
  "jlobt-nwtz2-zkncm-b4mh2-pge5u-3ec2v-mdac5-l4fzd-oix75-pks6j-2ae",
  "gforl-dm7ty-dstlf-enaa5-xd474-k4tlm-xxfoq-fgg6x-omjk4-te3mv-xqe",
  "42pqr-ppeb6-f4axm-mg474-ywmcy-5254r-wa2yh-6ultk-3cnwr-ngqlu-xqe",
  "4hqii-7v3o2-yogvx-zeibl-6sifq-c7zm5-2efio-i6gct-c725a-uuu6g-nae",
  "46p5h-fnpb5-ocja2-pm4pv-nzvwc-uekk6-e6n2u-zbohe-fgz34-wpxrd-jqe",
  "uykor-5giuj-hs5to-jzdim-vnizy-23v6c-w6o4v-excoz-5f2dy-zs4i5-nae",
  "e2j43-56dgx-xz3xw-f6y7g-usah4-ya7by-qqynm-qbnxh-wr7qp-qmcgo-jqe",
  "wswto-aeb7x-4etx2-lybjc-mfoma-l3efg-ieluq-t46rd-nw2m4-5maqe-kae",
  "ncnl3-sirob-pyoer-dslne-lqlm2-jslmx-j3mdd-4gf3t-cmbg7-42xvi-zae",
  "ldmio-6fbos-uwx3q-s7fyt-g3xgi-huxd7-nsjer-3haac-6ia6f-zuciw-dae",
  "dy2rw-f5frq-tpbtk-icoco-dz52d-5m57y-uwjjl-lm4oy-azrrf-m3vbb-aqe",
  "7mtwq-opmr4-xscpq-talxw-5ljok-isnn2-ctjrx-cbc3g-7bw2y-krpt7-sqe",
  "qwvcn-ws3dt-bnet2-ozhj2-atwbr-amqla-zealy-e2tkx-2zsgx-vcma4-7qe",
  "msa3l-ok2mm-mhnw5-sxjya-vrklw-d45bx-2juvp-lhnq6-5ka5x-2dwnc-lqe",
  "ffuck-kxghi-gyvia-r5htr-246cy-acq5u-2tdgd-avtvf-jyqbt-xtmf7-cae",
  "tn74f-iacec-blwhn-qymcu-i6zmt-toa3i-hwqqs-g2j5u-ekp5m-3m26i-3ae",
  "z7f4w-x2jof-3bahy-io55q-snyg5-55jnx-vmvnv-ixb25-uvnnc-wzcib-lae",
  "pw7ln-zm5eu-xp4a3-z3clm-zi5gm-ukmkv-veacx-hkbw7-srzyn-uhxgs-vae",
  "wuvbh-z6zwo-pbfgr-tmtyf-cljwd-7vmcs-d4cbe-iszjf-ccmny-ddier-aqe",
  "s74ms-b64dz-nh6nr-7iqjo-z54h3-teeb3-7gzbn-6g6le-jmbok-a7b2f-6ae",
];

// Static principal for system use
// a2t6b-nznbt-igjd3-ut25i-b43cf-mt45v-g3x2g-ro6h5-kowno-dx3rz-uqe
const SystemIdentitySecretKeyBuf = [0, 168,  50, 238,  17,  21, 153,  17,
  114,   3, 198,  75, 230, 144, 104,  18,
  165,  97, 192,  84,   1,  48, 161, 233,
  250, 142,  90, 243,  33, 243,  86,   2];

export const systemPrincipal = (() => {
  const identity = Secp256k1KeyIdentity.fromSecretKey(SystemIdentitySecretKeyBuf);
  const principal = identity.getPrincipal().toString();

  return {
    identity,
    principal,
  };
})();