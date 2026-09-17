window.__ModuleLoader__.load({
	id: "dsh-ppt",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/protocol.ts
		/**
		* Resolve workflow availability while preserving compatibility with older extracted templates.
		* @param template - Persisted or built-in template definition.
		* @param mode - Presentation workflow requesting the template.
		* @returns Whether the template is available to the requested workflow.
		*/
		function templateSupportsMode(template, mode) {
			return template.supportedModes?.includes(mode) ?? true;
		}
		//#endregion
		//#region src/client/curated-previews.ts
		/** Browser preview registry for every source-backed catalog template. */
		/** Content-addressed local image URLs; both clients share the core JPG files. */
		const CURATED_TEMPLATE_PREVIEWS = {"dsh-blue-professional":["/dsh-ppt/previews/868a103a21ffb7c05c3db006c2d3abdef714691572350af1173bc984bbb28ecb.jpg","/dsh-ppt/previews/cf37a24dec383c4595c057d7f044b9967583346829192ba38aff4decb25169ad.jpg","/dsh-ppt/previews/3f97a46d061b4dc47cb7da91435a743d621cdbc600d933145709e52e02f2e4a9.jpg","/dsh-ppt/previews/1f638ffdce60a794385a51c924d867ec17923b6cf32ae8019e7292aefe684e6c.jpg","/dsh-ppt/previews/986aaeafe96124e80d0a42c7038b40f83921a6eb0db76fd5aad4cb3e32c1c240.jpg","/dsh-ppt/previews/512ac2faea75296d7e5003d517f4aec0937e5b88fdb7db877d562d7f02c4efb6.jpg","/dsh-ppt/previews/58dd6121abec93c7237665cf79ea6dc6562d198ae9cadbdf61aa4f446339e8b4.jpg","/dsh-ppt/previews/0374e1174b59555c71a8efdf5e8aa3ca3f44c71db9d5b8045588edaaf08ad0cb.jpg","/dsh-ppt/previews/0ecb8745f9a5ef9f361f8517792cc0ec66c68ae2582eed5cbb867e3c8baf7742.jpg","/dsh-ppt/previews/882aaa1e1995cdf4b330d17338bf617bdeeccc1f25ff9969ef3735cfae0a75fd.jpg","/dsh-ppt/previews/539b0126fbe687906503faf6a2b5c28ef6dc496293eb1541857ce4536837a58f.jpg","/dsh-ppt/previews/5eac7a7dd81a6597c98c87965f8a828c5f278de06d86064acbc62dd45de3da7a.jpg"],"dsh-broadside":["/dsh-ppt/previews/2e6f686dbec5cf41db6fc8063ef99e9716f9ca2daac92fa4b56745acb45587e7.jpg","/dsh-ppt/previews/002981cea2eb73a2991d31837777ed5348f69f64d298d4c8899c37fe8f0b7e82.jpg","/dsh-ppt/previews/34740261b665bf3708f535282f75cbb13259ac35d5177f2ba8ab09a564320d6e.jpg","/dsh-ppt/previews/3d5d55feabdac78b8e643e2a307b4c2cee27ecdccc40a4eb4a1741eec51d6ec4.jpg","/dsh-ppt/previews/2f607fb64a97a231905d4dd890a72953d44b04de6544e527fd5ff4aee8c75054.jpg","/dsh-ppt/previews/06b07ac6e9fab55730e0fbc0446fec13b397c005ce3cbc10275ec03896072b27.jpg","/dsh-ppt/previews/71015f8d090f21d0bfa0d74d06aba0105841c541b616b03192a64d6de2574c9c.jpg","/dsh-ppt/previews/1560e2ac3107c75dfa8f6c5a5e2766c0a0f2293a8bcde09261b0b7088d591109.jpg","/dsh-ppt/previews/6e61aa23ef8612fc9168bd2556e010feb0107618299d278e9a7781d6534d44a7.jpg","/dsh-ppt/previews/c66bb94f312ba993dc11ad251a0f63432c9ab7ea636f7a36eedeb16ea078309b.jpg","/dsh-ppt/previews/1c67b711fca88d2eedbe27bb332f083db7e620a8557aee3f365c19d744630bfa.jpg","/dsh-ppt/previews/ee1f448518443a10bf5683ef6240a1be6316fdd7348b7b1e1d818a8db8ee74f1.jpg"],"dsh-cartesian":["/dsh-ppt/previews/a808b79b56240cde4657fb0856015e8dd418ddd2e49b01e14bd9e1d3e146adaa.jpg","/dsh-ppt/previews/35eeaa5b18c169f708e4e42f2492cfb2dbcce1ef86b06599c29e04d30b9d22f5.jpg","/dsh-ppt/previews/77c4ca59b44ec96cd8382f2f3a48caafacaf3b393851000ebb6a84284eec4839.jpg","/dsh-ppt/previews/63e069e69471434522a848003e7ae4f36fa809d5c9062a01879f62b1d5c8ab2d.jpg","/dsh-ppt/previews/d93a7be1dce350a30aa26811da9b1fc7938bc7414c7dc441907e04e8ba79ca3f.jpg","/dsh-ppt/previews/f65d93506cde15156428878f13e6f85b095ceb8ed9df7537bfb7e79c9780fd58.jpg","/dsh-ppt/previews/e6f759a647188fbfb7dee5999b89b084dd3f8fa830e287f82fdee079a296d96f.jpg","/dsh-ppt/previews/816c48af2d9158b382f0a4c0797fe820c76d3b6c7ce1c49ac55e0ef4e9e9fe46.jpg","/dsh-ppt/previews/1824c45afa9c4d983a8d6eb38e726ff51592372579cbe504f79cfc6f254ec5e3.jpg","/dsh-ppt/previews/316da6a75dd2e861047832c64fd0356ca953c17d4e66107033b268ce9cd5295c.jpg","/dsh-ppt/previews/175c2d14ba109530173b6d276aad52de9ea587b6e370a29f084f092d8e6ca553.jpg","/dsh-ppt/previews/b180ffeca1c203030a8596e7c4975a4ebd6eebfe82cf4f7253e03a3e399735f6.jpg"],"dsh-consulting-curated-swiss-signal-grid":["/dsh-ppt/previews/a9fc261ff602e85ae5bcf1f3f6618d7f53a27ca8fb1250e83e6cbbc5622f05a2.jpg","/dsh-ppt/previews/9245aaaf9fc11d16a981230ec9227e6e0d7e5a8f3aa92864e303ea2ed933cc5f.jpg","/dsh-ppt/previews/ac4a30b4d8c195f78efffe1797ef78051a88cb2c2ad78eed61c062150dc3ea10.jpg","/dsh-ppt/previews/4e27f5f5b82c4f90313d54f602ac2c3b45aa35be4a82550d0160aa43e534a6a6.jpg","/dsh-ppt/previews/f62bf7b4b3c352cd13863390cfcb74ce15ea2b89a00b5883bb77474fe0ad7e46.jpg","/dsh-ppt/previews/669df5cecd9218a4a06ebfb5d081bdfdca8e7dec162d9b79b4f863962de4d1c5.jpg","/dsh-ppt/previews/703cb1cc235aa26255fa1f3dd3278957de95fa90137dea2e145592b71f30000b.jpg","/dsh-ppt/previews/dc6cb0333176a2a61febec9fed2e1abfe8cc9a3efbb7bc401fbfebc2c7653b68.jpg","/dsh-ppt/previews/d6475a405923849dae440d8b501a88f684a6270c791db3bb78de63237b4ea36d.jpg","/dsh-ppt/previews/62ccc3f3a2c60aa5eba128236e569413d4709de7bba24666301c9cc0adaae76f.jpg","/dsh-ppt/previews/8d6611a9ae8d8fe1c92b6405ca0f30f3d880416434c6397d3f57870263301131.jpg","/dsh-ppt/previews/fa2a74cc83300bcd1a1d140377bca9c46fa14d9d50eb781e14747ec7fcc84060.jpg"],"dsh-course-workshop":["/dsh-ppt/previews/fed8b4d0d8ce5e7141bb50ae43c39d8cf9618a7c3f77e59477a395892fa57079.jpg","/dsh-ppt/previews/a40ee3f4e99b200fd2c5f284ff2ccaeba277833ef619f8f3dd86aa7a78cc045f.jpg","/dsh-ppt/previews/2a4eb9bf9b551687cc757593cadd44a4d0459564f757c270efd9eb8668b394bc.jpg","/dsh-ppt/previews/69c0ef5e960884089112845a05aa04c57ece1b01f68f488f397bc1603c8865ca.jpg","/dsh-ppt/previews/0ce54cf57bfcc1b3f980a3f33f1f970d24f8125dc520f2a656518f6f2cda4912.jpg","/dsh-ppt/previews/2518d599c39a113284b62c1bae03efeabf3429d5aca60280c7c33c032a4a2e89.jpg","/dsh-ppt/previews/db0c5105dc50f53b6e30fbd92f52cf60d64222264507809135147f4d3e7fff5b.jpg","/dsh-ppt/previews/554da5c3ee239b39e8df86145eb435d1a805f8185b47ce4299a2051fabd104ad.jpg","/dsh-ppt/previews/627eb4cac49c395a367435275089b2d99dd0638db3e9061237e210c879f0f07e.jpg","/dsh-ppt/previews/a3d256926ee527eaebf89bded5f355fa0eef1dafb68d22d5fca97ea3d6ca2f1b.jpg","/dsh-ppt/previews/62f8078de80f96d9745f0c5b0d8ef3f74a8fde3fd8ba0f76febba90c12d50645.jpg","/dsh-ppt/previews/0e1580e8d9157a6592acfedb05464a4373f641569eda84c878592b44dddd9078.jpg"],"dsh-editorial-forest":["/dsh-ppt/previews/602a146d4db9a3242c6e1c4a7bcb3baa3f2937d5e17570c460337a341766b30f.jpg","/dsh-ppt/previews/8d202fef8051dd0f30080ee02cc38bf8730a5e037739c9c3ebf2dee1203d9496.jpg","/dsh-ppt/previews/39968132d85c7e8c9b1dc8e0f553611d30b5db73145c35a875447427eaf22021.jpg","/dsh-ppt/previews/00554d6b491822b40fab87850226c5c6670c1a6a327c851c524d69219b5e06d9.jpg","/dsh-ppt/previews/d3bdcd19a6ed4f5835ee67c71df1f49e1191a29104e20268053dfa9348b46809.jpg","/dsh-ppt/previews/2bbfb7ff47a5b35011b1a2f633be4562110feae54f6f820d7cc73db6df1d9f32.jpg","/dsh-ppt/previews/0124f90ac4eab99d17a39be24e2721ca35ec8e4fd0b9c6c2f70d2ecc7bae476c.jpg","/dsh-ppt/previews/dfbab1e3ed4fc25ca4afe2e725ecf3d6b097da989bbf3016a0b243bc14db82ba.jpg","/dsh-ppt/previews/c9cdb76b6942517a687e40d8b29f70d5969c9d5bb3bc76a7b58c801f48e8dab0.jpg","/dsh-ppt/previews/446f8e7e066f9bb7d0210f0f61505df331460daf4e4249e5eb25b82c5fb3456a.jpg","/dsh-ppt/previews/acf81e5537f27c54fac23bd9b9d261074665df67afcf9f5391a45985a650a4bc.jpg","/dsh-ppt/previews/89998775d68eabfdb3bb88cfbd87b1fedf079bf9a85bd3d376df203d12fe4ce3.jpg"],"dsh-editorial-notebook":["/dsh-ppt/previews/64c6b0467a02358eab0e7c682b219ec10917e7457d8e65ab2734460e26ff006b.jpg","/dsh-ppt/previews/8abd112497cecf164b9d8d3b7f88978196013a6e8a68690740dbd8b50a8e3ef2.jpg","/dsh-ppt/previews/8cc740d20f1b5a0f3c5c5012b5991f6130414cd43eb8ecf72dbcd6908f29db5f.jpg","/dsh-ppt/previews/4dcd361d0086a690c660471202d4528fc6da72b051f30d19ba943dbb64e2e4db.jpg","/dsh-ppt/previews/68b87b7fe732344dc48deaeb9e85fa1a83f0d6f53965e2a20d83f876575eb0b3.jpg","/dsh-ppt/previews/5fafb45386a94acc94db14cc9e27d0ee7aff817b67b6f1e9966b29d3c7a1b752.jpg","/dsh-ppt/previews/b61d3f7e8330ed99137d5ca9a076715e07943b8c82a5f43901ce1b378083d3de.jpg","/dsh-ppt/previews/9ffb8c8b96c09b5ad8e52c71a3bac3def79593239140afa086a1d514c14e5d8d.jpg","/dsh-ppt/previews/7c05dd18fccacc12f1b914ef5f191e77538033127833410ce718ecb168e68044.jpg","/dsh-ppt/previews/11e802de58f2d6f22f799f1856818d845bb5a8a868a8df4505496ed213e905e4.jpg","/dsh-ppt/previews/0faedcf0681b4822510cdf63fffcb48e78aaff7857a1d25a55876c7956c34bbe.jpg","/dsh-ppt/previews/f1cfc6d9a19542ef9010ad2c97d11900f789c06e2710c29d7c95edea98992dd8.jpg"],"dsh-engineering-blueprint":["/dsh-ppt/previews/2d8d805401ca0dcc6866d1b218d46d3bdff9e1c05bca61a765b4f253bb2ba6fe.jpg","/dsh-ppt/previews/867b26c167cb7f3c64577d98792adcb95939a81d92aecb0e544f75707e6df61d.jpg","/dsh-ppt/previews/78f04acc8a457498e7d0e4b1dbfcda7d17aebf4c10d077771cc7c3431182a502.jpg","/dsh-ppt/previews/ddc9b69fc37b39f9300de821caa29903311aee88ed19e1c5538fd838c43bb7e1.jpg","/dsh-ppt/previews/c1967350c716cc02046f505e44bc821a39a935861676fa0c5e75c29fa34e5e18.jpg","/dsh-ppt/previews/22dd5793de7503f64e6589d57d4ca6cdf4753af78884f8ceca601a99857cc70a.jpg","/dsh-ppt/previews/0f03f78cca8ba49eb0b5dbc6b0a49da8cf24903a5246c1d51651afb4bb4f74ed.jpg","/dsh-ppt/previews/f4fb319f70eec1e32442190b5b15dee075c2ebb73aac0a056bd2e4aba4d73276.jpg","/dsh-ppt/previews/e839ee55067602e77dc21ae57d64e058611e33bd78a86dad8fcb9f0328b8bf57.jpg","/dsh-ppt/previews/7c670c63661ed054cbef90220700e54b1df470bed797e8c500c9341d7413b0f6.jpg","/dsh-ppt/previews/96d7d35e03ed2f1bd921a0524641d9ca0b71206e8247f8f137215ca25b55e554.jpg","/dsh-ppt/previews/aec3d2a73212cdfa6a1f50bd65f169891feb8e99048828348ebc75df70aa600c.jpg"],"dsh-monochrome":["/dsh-ppt/previews/f701eb4f55ec79e820038e174fcfaa88eed1682b224fd6be8b5892dcc64dea7a.jpg","/dsh-ppt/previews/97cfebc5a7385e914322d39107870ffb6388d9e03d6408369da15082c150ea81.jpg","/dsh-ppt/previews/ee9202fe024ea1523e7ee09954f60945aa57cabbe8c2d1b9b749a0a635f2caef.jpg","/dsh-ppt/previews/e8df029190881a5a1cd7ba18cfd0f1420f65d2e3a41714b43e905cccb6d6aaad.jpg","/dsh-ppt/previews/30794acd02cbb33965769f6739f067860761473b950471724925ba91d97bec81.jpg","/dsh-ppt/previews/0de450d11bbdb1fad6554a83bc8828c14db34356dd56ee8f06ab9ed0503950e6.jpg","/dsh-ppt/previews/50db53c9f4cc986e74903321ed353294ca14cbd2060439b14ef35090313dde92.jpg","/dsh-ppt/previews/a16a39f25123bcab08f3e22b19094af9297dad307ad9fc91d871801b231c4330.jpg","/dsh-ppt/previews/18f94a4936eda3fcba8debd98322c785c99fc66feba4adec45670dd4797b8a74.jpg","/dsh-ppt/previews/d1be235428f34261d37f52cd1242f8260be61c7043b771b5318873d036403231.jpg","/dsh-ppt/previews/294fec3556f51125c64501b4474add0cfee1131fa41cf7688837a056e122ae0b.jpg","/dsh-ppt/previews/03e37701d44a7a82e654fbced88afac4948d7251429345715c42a1ecf34661fa.jpg"],"dsh-neo-grid-bold":["/dsh-ppt/previews/42ecc9887ef7a3b8f397183f3c048efa8b2d2b35345419ea630b28df266f3790.jpg","/dsh-ppt/previews/381d43c1b1b70b994a31b4ee25d7d7f628a9426e70007a64cf01c55fce31ec8f.jpg","/dsh-ppt/previews/64e83c7d45ce86de423df9a342bed9be3245717912d4d07b6068bd924fb4c9c0.jpg","/dsh-ppt/previews/793eef0fe660522245e0dbca446c68f91162baeef63ae27e59cf5a7d30c55475.jpg","/dsh-ppt/previews/d734547a151865d1b73b7d71fbfe08fcaddf7ff7094c669ba463c3cea2965b8e.jpg","/dsh-ppt/previews/f67ef0d4e370e1c60519bb78b16a11788aed134b2e4bff4fda2ed4e5f6bfdc1f.jpg","/dsh-ppt/previews/766b33eb3d390fff007cfc0e6e5d96bc8dbd2809cb761214a20fc85a0eb54409.jpg","/dsh-ppt/previews/571836e3e8b781f7a9b0530eb7e9419b399aeda72b74eff899d1d429e7ee837e.jpg","/dsh-ppt/previews/0e9b9303517f3e07d9e7aa39a243a70b0d9bedc5dff374ce69e94f7a4260c34f.jpg","/dsh-ppt/previews/a03ac86b654acc78b1beee5d92f4655cbf7bfd801555d08e8b28ae4877aa6a75.jpg","/dsh-ppt/previews/2ffa678ab3033ec8ee480a9f606e2868f3b06f0382659945c5f533412dc81bf2.jpg","/dsh-ppt/previews/7436471b575a5ace540f4b36ef1fdb2c5073454e08ecbb6575ea832b80632b43.jpg"],"dsh-playful":["/dsh-ppt/previews/4edbea30c657a3b51a41969d9c7a817bf89bd99c32dff9917309da2ccd3f7f98.jpg","/dsh-ppt/previews/9eba580032113732acbb0cebc938b70ae39306d7df6c133aee2b41167b9bb308.jpg","/dsh-ppt/previews/2ad9bc36631dbce46ffab1f97edf10abc4c29f460c4334fe36e1424f86dda821.jpg","/dsh-ppt/previews/d9228f9b8e2f28876bbab72e53c4faf29395b390dcfe2c6472462c59074e5677.jpg","/dsh-ppt/previews/7599ebd17fa1666fc013d5922cf53247cefd41b0d7cf6ae02c65b15922e470b5.jpg","/dsh-ppt/previews/6f532cc31579c0bd4477bdbd647bd06b462cc6ae20c55eabdc7fe500d3f54ab2.jpg","/dsh-ppt/previews/3450dcf2261d97738861144de943d1bc39c5deb3dbb53e030c466f22c09cc75d.jpg","/dsh-ppt/previews/c10e9f7d4779fe1ec3a141cda7c6c851bace7191c1499680d185acc22ada7aa8.jpg","/dsh-ppt/previews/5bece461636792f9ac7b727f3d6e454944fd478cb0b8c196c51d594f52efa4fc.jpg","/dsh-ppt/previews/4ed05f3281426a89e08b1bfdcb770202570057e7223348fb041bda7dcfae79b7.jpg","/dsh-ppt/previews/b16c23a7ce96b32af0506a8e9af131637dd6cfb65272a775cee5d2327b1d7dc1.jpg","/dsh-ppt/previews/c44af6131cbf2f3340e30d4129166bf71f5366e0124bbdfb14892db8e0e6708d.jpg"],"dsh-sakura-chroma":["/dsh-ppt/previews/37e9b8f2cfb6f41e914a39afa83a75d803ee0f737c4c6a1359db430bcf62e892.jpg","/dsh-ppt/previews/e70e30b7b5eedb9946f6db1a4d4c8d8cf1dc5b62403bf7a6f8655a28d1023134.jpg","/dsh-ppt/previews/25183092c8159e828f5ab83b5340866309048e14983440192c376eb59ef4f4da.jpg","/dsh-ppt/previews/40c18cd52ab8a1308fea24e8d58259c94df366c822515a9942613ba6ef227ef8.jpg","/dsh-ppt/previews/ff657f6c773c9efda3f23d20d23a5a30551ef5a96735e6cc415ab1df91a5e901.jpg","/dsh-ppt/previews/7258ee425f3d22df91d5e8aa8e114281e0da9a008044173d5cac1676b3fdfa59.jpg","/dsh-ppt/previews/147cf72d365991d061c7e4c313e467c6162d62cf8860a8410973caab1e11aef2.jpg","/dsh-ppt/previews/ac468754eb618d5b26edb83c16fb87b0c84e19f2f2fd4f346ef19121afd1ab6f.jpg","/dsh-ppt/previews/19fd60f4e64e18be514fd32009b3ab71f1e83c10ee6d559a56b8790c95f6b734.jpg","/dsh-ppt/previews/768c0f362a9c5cae7821401173c491777833aabedc9566c51c1308380cf6e047.jpg","/dsh-ppt/previews/dc835bd049d7ad76f8cd24cb1cefae1240b1cb5ab11ba65829bd96bb18497021.jpg","/dsh-ppt/previews/c2d760b629fe3337fcdfc889538a67b36f161a4194d641943dd77e58c68e7abf.jpg"],"dsh-signal":["/dsh-ppt/previews/e1ebc7996873e192a6a8e91b12e4da56756d98e0124baae6a5c78e17b1a63ff1.jpg","/dsh-ppt/previews/dfcb693665809f399d6626f31963efa24347dc654b49a986538f494d7b28bf31.jpg","/dsh-ppt/previews/28fea0e9c858a03fbe101148ca23ab910ee4cdee87ba6a31b232f922853952cb.jpg","/dsh-ppt/previews/eb7ba941e62a2a067f0938b62d4b11cb57d21710acbc516274080526a61a96a9.jpg","/dsh-ppt/previews/fc75d303af4d57715883610b1cc3530e1081c3b5d80bf9e29fcffeda7fb1cdb5.jpg","/dsh-ppt/previews/badf1cdc20c1ee9988bee10c99618e1c8beb5fa651aeb2cf574157bd38409850.jpg","/dsh-ppt/previews/339e5c7dfcd5af524580084155d9a977caa621136c270b28973928db8bcfbbfe.jpg","/dsh-ppt/previews/c98c474084e88f4d0d14d182b07a947bf21572c11621fe4f47f7a273009ed5af.jpg","/dsh-ppt/previews/96cadd291ad03d6a8e3d63ccce017093bb000614f868903429eb8f2beb2ce8e5.jpg","/dsh-ppt/previews/18ad51348ccb5ac5855d6008ab0f665e40459872aeaee38ca5931350e9c9f717.jpg","/dsh-ppt/previews/3578a587665afe90b3ddffd479e00b4c034f57febf3200baf2b7d6dea0acce54.jpg","/dsh-ppt/previews/8a11a88decd2d2434295c55f92fe311aaa5ce9c2a051bab306277374efd22db8.jpg"],"dsh-soft-editorial":["/dsh-ppt/previews/f4984470ee6aceef2064ec65c546cdd73f0c267bc814eaa3b101fa797fb0018f.jpg","/dsh-ppt/previews/ef510f7616c701d8e2991baca9bb29b5611d8d01eac5ee5f86b329f820123132.jpg","/dsh-ppt/previews/e059dd44269991e8b8e5cdff183862865061d68804fa09a259d842df4dfb663f.jpg","/dsh-ppt/previews/ffad10e507032c1279878f6197cf1a5901efb6d9ad052dea8a728ef9a170dd25.jpg","/dsh-ppt/previews/0900fb3baf783507567b5013348fc56dd43da13e8914ae3317ddf7d5739a3305.jpg","/dsh-ppt/previews/ea9558c4e2571ea9cb8e539f212403afa70981f30c01f2321513bba298aee76e.jpg","/dsh-ppt/previews/379f5b94697dce71b9bd7740356592efc6b292c5f98641dd787858ba6c690065.jpg","/dsh-ppt/previews/ba75e21f18de64ba003a9bec7a7096573cdae7a480e1a4365c1523c62e704830.jpg","/dsh-ppt/previews/3e0076a4d166477be2caf00e60c7a40c450312942cf94c4a2d65a43e5ac52d52.jpg","/dsh-ppt/previews/e14476fbd7eeab933e02fbc62b233a8e786bd32782ccb5cc19bb86a1708382ab.jpg","/dsh-ppt/previews/dc367d2c7697c9be87d95c9bc0a19b6e3f2f132cf5aa8fa464f7cf0afdd21b36.jpg","/dsh-ppt/previews/35ae039f1983df07f51660763edc82e4f1d3991d0ada37da64b432d588f88e42.jpg"],"dsh-work-curated-modular-logistics-system":["/dsh-ppt/previews/352a8b8ecb36f7afaea2cb217d2e2a0f7fd5d046a34e0b627dd305dc4b274b0d.jpg","/dsh-ppt/previews/f07ce2e140c1073ccf41ce94a9432757a04ee6c944ad960349662d3b8aaa2dec.jpg","/dsh-ppt/previews/d044d9db6f2ae8f200bf049da71d3e9b64212da65747849102434b9397836a08.jpg","/dsh-ppt/previews/d0150b3bdd9baa1900d42c0c421296bca8c2727c28b962b359fd5cbfbc2382d9.jpg","/dsh-ppt/previews/b8f83ef6cc86a54e9df9bd6ebafd0e7f454c5dba6b43654d39cdb37658b1a63c.jpg","/dsh-ppt/previews/2040f8a2f887840ac51cf703f458f321814b7614e86b566118a88e76ce8ed4ac.jpg","/dsh-ppt/previews/2524d20ed733c8061cc163106d9f90b8bb208f4386877c9b12c18b19d8baafda.jpg","/dsh-ppt/previews/3a1387a8ab99c7c0542fea7c46d42eef32d1d4252605ff0db939d991588c3581.jpg","/dsh-ppt/previews/ea6ee0677a90f2960fdf6a30e6db66822b605bb4dc6e1699045ff5099e7595b0.jpg","/dsh-ppt/previews/6fbbbb664e18ebbb5898772348001c55b71f8a62310976655dca0cf37fbcdc0a.jpg","/dsh-ppt/previews/d3bddd9040ebd84c4641894d693b6436d4b3b080dfaf603176230599bf377025.jpg","/dsh-ppt/previews/dc6bba255470230eda70eb93cf161e290e79af81476a5acba7abf660ab0c97e8.jpg"],"dsh-work-curated-nordic-operating-report":["/dsh-ppt/previews/50edbc49b9e3003012bb87de8f93ab9b2b4784fa8494f4844dbd2f61e6a086b1.jpg","/dsh-ppt/previews/9effb8added62e9b8fc6982e652b7f32639f6aede8dc9a858913c2ee1a60235a.jpg","/dsh-ppt/previews/33e2639b91ae4dbe6ac1d2c963eb46d1eea4df85f30b712b73895012d1a3c6c0.jpg","/dsh-ppt/previews/4d970687799e035c9dd0df109fe65e76ea1b96c0d8d481299ff435d30a65ce26.jpg","/dsh-ppt/previews/57b3457cea8f332669b56fd01bc571d5f380a530750ba02aab7b8ef9614fd1a7.jpg","/dsh-ppt/previews/5152fd5bf15f0a27a55ae25723dde7dfb60fef7b6226dcb6c5b4cdeea6bd5ecf.jpg","/dsh-ppt/previews/9883a506d8163b0ade962f9502253b28a6d7b2551d3447869b0dcaaf30c15e8b.jpg","/dsh-ppt/previews/d3d3e7142733b18fdeb394da10e0328fa48ccc79d6d14848372610bd2d262175.jpg","/dsh-ppt/previews/2955b1fc98891bad55c2bfe0fa8d8a6ef90cc7c177a4ac0180fe9f117ca15b0e.jpg","/dsh-ppt/previews/2e1273cc2309932480aed2ffd181c827ab3f97740fee83419fc69d50ceb29aea.jpg","/dsh-ppt/previews/707c85ed84f668a51aef02c85e42acaa5db0daad623269c5dd64bb3e3f1b966f.jpg","/dsh-ppt/previews/ea1168214e3e137254c2ad219d3c96bcb74f67fe7bd344522a70f1765a4e6d93.jpg"]};
		//#endregion
		//#region \0dsh-css:ppt-composer.css.mjs
		const css = "._3723UG_modeRoot{box-sizing:border-box;width:100%;padding:0 var(--dsh-composer-side-clearance);position:relative}._3723UG_modeRow{flex-wrap:wrap;justify-content:flex-start;align-items:center;gap:8px;min-height:32px;display:flex}._3723UG_modeChip{border:1px solid var(--dsw-alias-border-l2-darkmode-thin);color:var(--dsw-alias-label-secondary);font:inherit;cursor:pointer;background:0 0;border-radius:999px;align-items:center;gap:6px;padding:7px 13px;font-size:12px;line-height:16px;display:inline-flex}._3723UG_modeChip:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}._3723UG_modeChip[data-selected=true]{border-color:color-mix(in srgb, var(--dsw-alias-state-business-primary) 55%, transparent);background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 12%, transparent);color:var(--dsw-alias-state-business-primary)}._3723UG_templatePanel{box-sizing:border-box;z-index:2;width:100%;max-width:calc(var(--dsh-composer-card-max-width) + 32px);height:var(--office-ppt-template-panel-height,calc(100dvh - 178px));max-height:var(--office-ppt-template-panel-height,calc(100dvh - 178px));background:0 0;flex-direction:column;margin-top:8px;display:flex;position:absolute;top:100%;left:50%;overflow:hidden;transform:translate(-50%)}._3723UG_modeRoot[data-placement=fixed]{height:0;overflow:visible}._3723UG_modeRoot[data-placement=fixed] ._3723UG_templatePanel{max-height:none;top:0}._3723UG_modeRoot[data-placement=fixed] ._3723UG_templateViewport{overscroll-behavior:contain;flex:auto;padding-bottom:12px;overflow-y:auto}._3723UG_templateToolbar{z-index:2;background:0 0;flex:none;justify-content:space-between;align-items:center;gap:12px;min-height:38px;display:flex;position:relative}._3723UG_templateViewport{box-sizing:border-box;overscroll-behavior:contain;scrollbar-width:none;min-height:0;padding-bottom:12px;overflow-y:auto}._3723UG_templateViewport::-webkit-scrollbar{display:none}._3723UG_categoryTabs{scrollbar-width:none;gap:4px;min-width:0;display:flex;overflow-x:auto}._3723UG_categoryTabs::-webkit-scrollbar{display:none}._3723UG_categoryTabs button{color:var(--dsw-alias-label-caption);font:inherit;cursor:pointer;background:0 0;border:0;border-radius:999px;flex:none;padding:5px 10px;font-size:11px;line-height:16px}._3723UG_categoryTabs button:hover{color:var(--dsw-alias-label-primary)}._3723UG_categoryTabs button[data-selected=true]{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}._3723UG_templateGrid{background:0 0;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px 14px;display:grid}._3723UG_templateCard{min-width:0;min-height:0;position:relative}._3723UG_templateSelect{width:100%;min-width:0;color:var(--dsw-alias-label-tertiary);font:inherit;cursor:pointer;background:0 0;border:0;outline:0;flex-direction:column;padding:0;display:flex}._3723UG_previewViewport,._3723UG_selectionPreview{container-type:inline-size}._3723UG_previewViewport{aspect-ratio:16/9;border:2px solid #0000;border-radius:9px;width:100%;transition:border-color .12s,transform .12s;display:block;position:relative;overflow:hidden}._3723UG_previewViewport:after{content:\"\";position:absolute;inset:0;z-index:2;border-radius:7px;box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--dsw-alias-label-primary) 25%, transparent);pointer-events:none}._3723UG_previewViewport>._3723UG_preview{aspect-ratio:auto;width:100%;height:100%;animation:.18s _3723UG_previewReveal}@keyframes _3723UG_previewReveal{0%{opacity:.72}to{opacity:1}}._3723UG_templateCard:hover ._3723UG_previewViewport{transform:translateY(-1px)}._3723UG_templateSelect:active ._3723UG_previewViewport{transform:scale(.985)}._3723UG_templateCard[data-selected=true] ._3723UG_previewViewport{border-color:var(--dsw-alias-state-business-primary)}._3723UG_templateSelect:focus-visible ._3723UG_previewViewport{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}._3723UG_templateName{text-align:center;text-overflow:ellipsis;white-space:nowrap;padding-top:5px;font-size:12px;line-height:16px;overflow:hidden}._3723UG_templateCard[data-selected=true] ._3723UG_templateName{color:var(--dsw-alias-label-primary)}._3723UG_panelState{min-height:160px;color:var(--dsw-alias-label-tertiary);place-items:center;gap:10px;font-size:12px;display:grid}._3723UG_templateError{border:1px solid color-mix(in srgb, var(--dsw-alias-state-error-primary) 40%, transparent);background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, transparent);color:var(--dsw-alias-state-error-primary);border-radius:8px;margin-bottom:8px;padding:7px 10px;font-size:11px;line-height:16px}._3723UG_retryButton{border:1px solid var(--dsw-alias-border-l2-darkmode-thin);color:var(--dsw-alias-label-secondary);font:inherit;cursor:pointer;background:0 0;border-radius:999px;padding:6px 12px}._3723UG_retryButton:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}._3723UG_selection{align-items:flex-start;display:flex}._3723UG_selectionPreview{aspect-ratio:16/9;transform-origin:50%;flex:none;width:clamp(76px,10vw,92px);transition:transform .2s cubic-bezier(.34,1.56,.64,1);display:block;position:relative;transform:rotate(-3deg)scale(1)}._3723UG_selectionFrame{border:2px solid var(--dsw-alias-state-business-primary);background:var(--dsw-alias-bg-base);border-radius:9px;width:100%;height:100%;display:block;overflow:hidden;box-shadow:0 4px 14px #0000002e}._3723UG_selectionRemove{z-index:2;color:#fff;opacity:0;pointer-events:none;cursor:pointer;background:#111111e0;border:1px solid #ffffff4d;border-radius:50%;place-items:center;width:20px;height:20px;padding:0;font:500 15px/1 ui-sans-serif,system-ui,sans-serif;transition:opacity .12s,transform .12s;display:grid;position:absolute;top:-8px;right:-8px;transform:rotate(3deg)scale(.88);box-shadow:0 3px 10px #00000047}._3723UG_selectionPreview:hover ._3723UG_selectionRemove,._3723UG_selectionPreview:focus-within ._3723UG_selectionRemove{opacity:1;pointer-events:auto;transform:rotate(3deg)scale(1)}._3723UG_selectionRemove:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}._3723UG_preview{box-sizing:border-box;aspect-ratio:16/9;background:var(--office-bg);color:var(--office-text);flex-direction:column;justify-content:center;padding:12% 10%;display:flex;position:relative;overflow:hidden}._3723UG_preview[data-source-preview=true]{background:#fff;padding:0}._3723UG_preview[data-source-preview=true]:before,._3723UG_preview[data-source-preview=true]:after{display:none}._3723UG_previewImage{object-fit:cover;width:100%;height:100%;display:block;position:absolute;inset:0}._3723UG_preview:before,._3723UG_preview:after{content:\"\";pointer-events:none;position:absolute}._3723UG_preview:before{border-left:1px solid color-mix(in srgb, var(--office-accent) 35%, transparent);background:color-mix(in srgb, var(--office-surface) 92%, transparent);width:34%;height:100%;top:0;right:0}._3723UG_preview:after{background:var(--office-accent);width:18%;height:clamp(1px,1.3cqi,3px);bottom:13%;right:8%}._3723UG_previewAccent{background:var(--office-accent);width:18%;height:clamp(1px,1.3cqi,3px);position:absolute;top:16%;left:10%}._3723UG_preview strong,._3723UG_preview small{z-index:1;text-overflow:ellipsis;white-space:nowrap;width:66%;display:block;position:relative;overflow:hidden}._3723UG_preview strong{margin-top:8%;font-size:clamp(4px,6cqi,14px);font-weight:650;line-height:1.12}._3723UG_preview small{color:var(--office-muted);margin-top:4px;font-size:clamp(3px,3.4cqi,8px)}._3723UG_preview[data-variant=blue-professional]:before{clip-path:polygon(25% 0,100% 0,100% 100%,0 100%);background:var(--office-surface);border:0;width:40%}._3723UG_preview[data-variant=blue-professional]:after{width:15%;height:2px;bottom:14%;right:8%}._3723UG_preview[data-variant=editorial-forest]{background:var(--office-surface);color:var(--office-accent);justify-content:flex-end;padding:10%;font-family:Georgia,Times New Roman,serif}._3723UG_preview[data-variant=editorial-forest]:before{aspect-ratio:1;border:1px solid var(--office-accent);background:0 0;border-radius:50%;width:16%;height:auto;top:11%;right:9%}._3723UG_preview[data-variant=editorial-forest]:after{background:var(--office-accent);width:80%;height:1px;bottom:10%;right:10%}._3723UG_preview[data-variant=editorial-forest] ._3723UG_previewAccent{background:var(--office-accent);width:26%;height:1px;top:13%}._3723UG_preview[data-variant=editorial-forest] strong,._3723UG_preview[data-variant=editorial-forest] small{width:78%}._3723UG_preview[data-variant=editorial-forest] strong{margin-bottom:11%;font-size:clamp(5px,7.4cqi,17px);font-weight:500}._3723UG_preview[data-variant=editorial-forest] small{color:var(--office-bg);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;position:absolute;top:16%;left:10%}._3723UG_preview[data-variant=signal]{background:var(--office-bg);color:var(--office-text);font-family:Georgia,Times New Roman,serif}._3723UG_preview[data-variant=signal]:before{background-image:linear-gradient(color-mix(in srgb, var(--office-secondary) 55%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--office-secondary) 55%, transparent) 1px, transparent 1px);opacity:.45;background-size:18% 31%;border:0;width:100%;height:100%;inset:0}._3723UG_preview[data-variant=signal]:after{background:var(--office-secondary);width:80%;height:1px;bottom:15%;left:10%;right:auto}._3723UG_preview[data-variant=signal] ._3723UG_previewAccent{background:var(--office-accent);width:14%;height:1px;top:18%}._3723UG_preview[data-variant=signal] strong{font-size:clamp(5px,6.8cqi,16px);font-weight:600}._3723UG_preview[data-variant=signal] small{color:var(--office-muted);letter-spacing:.08em;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}._3723UG_preview[data-variant=orange-data]{color:#111;background:#fff;justify-content:flex-start;padding:15% 8%;font-family:Arial,sans-serif}._3723UG_preview[data-variant=orange-data]:before{background:linear-gradient(90deg, var(--office-accent) 0 25%, var(--office-secondary) 25% 50%, #f19309 50% 75%, #f9c22b 75%) 0 21% / 100% 28% no-repeat, linear-gradient(#f2f2f2 0 0) 0 70% / 72% 24% no-repeat;border:0;border-top:clamp(1px,.9cqi,2px) solid #111;width:84%;height:45%;inset:8% 8% auto}._3723UG_preview[data-variant=orange-data]:after{background:#111;width:84%;height:11%;bottom:11%;right:8%}._3723UG_preview[data-variant=orange-data] ._3723UG_previewAccent{background:var(--office-accent);width:22%;height:clamp(1px,.9cqi,2px);top:8%;left:8%}._3723UG_preview[data-variant=orange-data] strong,._3723UG_preview[data-variant=orange-data] small{z-index:2;width:52%}._3723UG_preview[data-variant=orange-data] strong{margin-top:10%;font-size:clamp(4px,5.8cqi,13px)}._3723UG_preview[data-variant=orange-data] small{color:#5b626d;letter-spacing:.06em;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}._3723UG_preview[data-variant=custom]:before{background:linear-gradient(145deg, var(--office-surface), var(--office-secondary));width:40%}._3723UG_preview[data-page=\"1\"],._3723UG_preview[data-page=\"2\"]{background:color-mix(in srgb, var(--office-bg) 92%, var(--office-surface));color:var(--office-text);font-family:var(--font-sans,ui-sans-serif, system-ui, sans-serif);justify-content:flex-start;padding:8% 8% 7%}._3723UG_preview[data-page=\"1\"]:before,._3723UG_preview[data-page=\"2\"]:before{background:linear-gradient(90deg, color-mix(in srgb, var(--office-accent) 13%, transparent) 1px, transparent 1px), linear-gradient(color-mix(in srgb, var(--office-accent) 13%, transparent) 1px, transparent 1px);clip-path:none;opacity:.48;background-size:20% 25%;border:0;width:100%;height:100%;inset:0}._3723UG_preview[data-page=\"1\"]:after,._3723UG_preview[data-page=\"2\"]:after{background:var(--office-accent);width:18%;height:2px;top:8%;bottom:auto;right:8%}._3723UG_preview[data-page=\"1\"] ._3723UG_previewAccent,._3723UG_preview[data-page=\"2\"] ._3723UG_previewAccent{background:color-mix(in srgb, var(--office-muted) 38%, transparent);width:84%;height:1px;top:auto;bottom:7%;left:8%}._3723UG_preview[data-page=\"1\"] strong,._3723UG_preview[data-page=\"2\"] strong{width:78%;margin-top:3%;font-size:clamp(4px,5.3cqi,12px);line-height:1.12}._3723UG_previewEyebrow{letter-spacing:.06em;width:74%!important;color:var(--office-muted)!important;margin:0!important;font:500 clamp(3px,2.7cqi,6px)/1.1 ui-monospace,SFMono-Regular,Menlo,monospace!important}._3723UG_previewKpis{z-index:1;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px;width:100%;margin-top:auto;display:grid;position:relative}._3723UG_previewKpis>span{border:1px solid color-mix(in srgb, var(--office-accent) 18%, transparent);background:color-mix(in srgb, var(--office-surface) 88%, transparent);border-radius:3px;justify-content:space-between;align-items:baseline;min-width:0;padding:7% 8%;display:flex}._3723UG_previewKpis b{font-size:clamp(4px,4.8cqi,11px);font-weight:700}._3723UG_previewKpis i{color:var(--office-muted);font:clamp(2px,2.2cqi,5px)/1 ui-monospace,monospace}._3723UG_previewFooter,._3723UG_previewInsight{z-index:1;width:100%;color:var(--office-muted);text-overflow:ellipsis;white-space:nowrap;margin-top:4px;font-size:clamp(2px,2.3cqi,5px);line-height:1.15;display:block;position:relative;overflow:hidden}._3723UG_previewChart{z-index:1;border-bottom:1px solid color-mix(in srgb, var(--office-muted) 34%, transparent);align-items:flex-end;gap:7%;height:43%;margin-top:auto;padding:4% 5% 0;display:flex;position:relative}._3723UG_previewChart i{background:var(--office-accent);border-radius:2px 2px 0 0;width:11%}._3723UG_previewChart i:first-child{opacity:.52;height:28%}._3723UG_previewChart i:nth-child(2){opacity:.64;height:46%}._3723UG_previewChart i:nth-child(3){opacity:.76;height:41%}._3723UG_previewChart i:nth-child(4){opacity:.88;height:72%}._3723UG_previewChart i:nth-child(5){height:91%}@media (prefers-reduced-motion:reduce){._3723UG_previewViewport,._3723UG_selectionPreview{transition:none}._3723UG_previewViewport>._3723UG_preview{animation:none}}";
		const tagId = "dsh-ppt/OfficePptHero.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-ppt";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var OfficePptHero_module_css_default = {
			"categoryTabs": "_3723UG_categoryTabs",
			"modeChip": "_3723UG_modeChip",
			"modeRoot": "_3723UG_modeRoot",
			"modeRow": "_3723UG_modeRow",
			"panelState": "_3723UG_panelState",
			"preview": "_3723UG_preview",
			"previewAccent": "_3723UG_previewAccent",
			"previewChart": "_3723UG_previewChart",
			"previewEyebrow": "_3723UG_previewEyebrow",
			"previewFooter": "_3723UG_previewFooter",
			"previewImage": "_3723UG_previewImage",
			"previewInsight": "_3723UG_previewInsight",
			"previewKpis": "_3723UG_previewKpis",
			"previewReveal": "_3723UG_previewReveal",
			"previewViewport": "_3723UG_previewViewport",
			"retryButton": "_3723UG_retryButton",
			"selection": "_3723UG_selection",
			"selectionFrame": "_3723UG_selectionFrame",
			"selectionPreview": "_3723UG_selectionPreview",
			"selectionRemove": "_3723UG_selectionRemove",
			"templateCard": "_3723UG_templateCard",
			"templateError": "_3723UG_templateError",
			"templateGrid": "_3723UG_templateGrid",
			"templateName": "_3723UG_templateName",
			"templatePanel": "_3723UG_templatePanel",
			"templateSelect": "_3723UG_templateSelect",
			"templateToolbar": "_3723UG_templateToolbar",
			"templateViewport": "_3723UG_templateViewport"
		};
		//#endregion
		//#region src/client/OfficePptHero.tsx
		/** DSH PPT template chooser integrated into the blank-session composer. */
		const TEMPLATE_CATEGORIES = [
			"all",
			"strategy",
			"business",
			"consulting",
			"finance",
			"work",
			"promotion",
			"academic", "editorial"
		];
		const SELECTED_PREVIEW_ENTRY_TRANSFORM = "rotate(-3deg) scale(.92)";
		const SELECTED_PREVIEW_REST_TRANSFORM = "rotate(-3deg) scale(1)";
		const SELECTED_PREVIEW_DURATION_MS = 200;
		const TEMPLATE_LOAD_TIMEOUT_MS = 8e3;
		const FALLBACK_TEMPLATE_PREVIEW_PAGE_COUNT = 3;
		const TEMPLATE_PREVIEW_AUTOPLAY_START_MS = 420;
		const TEMPLATE_PREVIEW_AUTOPLAY_INTERVAL_MS = 900;
		const TEMPLATE_PREVIEW_WHEEL_LOCK_MS = 180;
		const TEMPLATE_DOCK_BOTTOM_PX = 12;
		const TEMPLATE_PANEL_MIN_HEIGHT_PX = 200;
		const EMPTY_STATE = {
			activeMode: null,
			loading: false,
			templates: [],
			selectedId: null,
            notice: false,
			error: ""
		};
		/** Session-keyed presentation state shared by the action tray and composer accessory. */
		var OfficePptHeroStore = class {
			states = /* @__PURE__ */ new Map();
			listeners = /* @__PURE__ */ new Map();
			snapshot(sessionId) {
				return this.states.get(sessionId) ?? EMPTY_STATE;
			}
			subscribe(sessionId, listener) {
				const listeners = this.listeners.get(sessionId) ?? /* @__PURE__ */ new Set();
				listeners.add(listener);
				this.listeners.set(sessionId, listeners);
				return () => {
					listeners.delete(listener);
					if (listeners.size === 0) this.listeners.delete(sessionId);
				};
			}
			setMode(sessionId, activeMode) {
				this.update(sessionId, (current) => ({
					...current,
					activeMode,
					error: ""
				}));
			}
			setLoading(sessionId, loading) {
				this.update(sessionId, (current) => ({
					...current,
					loading,
					error: loading ? "" : current.error
				}));
			}
			setNotice(sessionId, notice) {
                this.update(sessionId, current => ({ ...current, notice }));
            }
            setError(sessionId, error) {
				this.update(sessionId, (current) => ({
					...current,
					loading: false,
					error
				}));
			}
			setTemplates(sessionId, templates) {
				this.update(sessionId, (current) => ({
					...current,
					loading: false,
					templates,
					selectedId: templates.some((template) => template.id === current.selectedId) ? current.selectedId : null,
					error: ""
				}));
			}
			select(sessionId, template, activeMode) {
				this.update(sessionId, (current) => ({
					...current,
					activeMode,
					loading: false,
					selectedId: template.id,
                    notice: false,
					error: ""
				}));
			}
			deselect(sessionId, activeMode) {
				this.update(sessionId, (current) => ({
					...current,
					activeMode,
					loading: false,
					selectedId: null,
					error: ""
				}));
			}
			update(sessionId, transform) {
				this.states.set(sessionId, transform(this.snapshot(sessionId)));
				for (const listener of this.listeners.get(sessionId) ?? []) listener();
			}
		};
		function useMode(mode, sessionId) {
			return (0, react.useSyncExternalStore)((listener) => mode.subscribe(sessionId, listener), () => mode.snapshot(sessionId), () => mode.snapshot(sessionId));
		}
		function templateStyle(template) {
			return {
				"--office-bg": `#${template.palette.background}`,
				"--office-surface": `#${template.palette.surface}`,
				"--office-text": `#${template.palette.text}`,
				"--office-muted": `#${template.palette.muted}`,
				"--office-accent": `#${template.palette.accent}`,
				"--office-secondary": `#${template.palette.secondary}`
			};
		}
		function templateCategory(template) {
			if (template.origin === "extracted") return "custom";
			return template.category ?? "business";
		}
		function templateVariant(template) {
			return template.source?.visualGrammar ?? "custom";
		}
		function templatePreviewPages(template) {
			return CURATED_TEMPLATE_PREVIEWS[template.id]?.length ?? FALLBACK_TEMPLATE_PREVIEW_PAGE_COUNT;
		}
		function TemplatePreview({ template, page = 0 }) {
			const previewImage = CURATED_TEMPLATE_PREVIEWS[template.id]?.[page];
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: OfficePptHero_module_css_default.preview,
				"data-page": page,
				"data-source-preview": previewImage === void 0 ? void 0 : true,
				"data-variant": templateVariant(template),
				style: templateStyle(template),
				children: [previewImage !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
					className: OfficePptHero_module_css_default.previewImage,
					src: previewImage,
					loading: "lazy",
					decoding: "async",
					alt: "",
					"aria-hidden": "true"
				}), previewImage === void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: OfficePptHero_module_css_default.previewAccent }),
					page === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: template.previewTitle }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", { children: template.previewSubtitle })] }),
					page === 1 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", {
							className: OfficePptHero_module_css_default.previewEyebrow,
							children: template.previewSubtitle
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: template.previewTitle }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: OfficePptHero_module_css_default.previewKpis,
							"aria-hidden": "true",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: "32%" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { children: "01" })] }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: "18.6" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { children: "02" })] }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: "04" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { children: "03" })] })
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: OfficePptHero_module_css_default.previewFooter,
							children: template.description
						})
					] }),
					page === 2 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", {
							className: OfficePptHero_module_css_default.previewEyebrow,
							children: template.previewSubtitle
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: template.previewTitle }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: OfficePptHero_module_css_default.previewChart,
							"aria-hidden": "true",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", {}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", {}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", {}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", {}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", {})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: OfficePptHero_module_css_default.previewInsight,
							children: template.description
						})
					] })
				] })]
			});
		}
		function TemplatePreviewDeck({ template, page }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: OfficePptHero_module_css_default.previewViewport,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TemplatePreview, {
					template,
					page
				}, page)
			});
		}
		function TemplateCard({ template, selected, choose }) {
			const [page, setPage] = (0, react.useState)(0);
			const [hovered, setHovered] = (0, react.useState)(false);
			const card = (0, react.useRef)(null);
			const hoveredCard = (0, react.useRef)(false);
			const lastWheelAt = (0, react.useRef)(Number.NEGATIVE_INFINITY);
			const pageCount = templatePreviewPages(template);
			(0, react.useEffect)(() => {
				if (!hovered || pageCount <= 1 || reducedMotionPreferred()) return;
				const advance = () => {
					if (!hoveredCard.current || document.visibilityState === "hidden") return;
					if (performance.now() - lastWheelAt.current < TEMPLATE_PREVIEW_AUTOPLAY_INTERVAL_MS) return;
					setPage((current) => (current + 1) % pageCount);
				};
				let interval;
				const start = window.setTimeout(() => {
					advance();
					interval = window.setInterval(advance, TEMPLATE_PREVIEW_AUTOPLAY_INTERVAL_MS);
				}, TEMPLATE_PREVIEW_AUTOPLAY_START_MS);
				return () => {
					window.clearTimeout(start);
					if (interval !== void 0) window.clearInterval(interval);
				};
			}, [hovered, pageCount]);
			(0, react.useEffect)(() => {
				const element = card.current;
				if (!hovered || element === null) return;
				const stopOutsideCard = (event) => {
					if (event.target instanceof Node && element.contains(event.target)) return;
					hoveredCard.current = false;
					setHovered(false);
					setPage(0);
					lastWheelAt.current = Number.NEGATIVE_INFINITY;
				};
				document.addEventListener("mousemove", stopOutsideCard, true);
				return () => {
					document.removeEventListener("mousemove", stopOutsideCard, true);
				};
			}, [hovered]);
			(0, react.useEffect)(() => {
				const element = card.current;
				if (element === null || pageCount <= 1) return;
				const pageWithWheel = (event) => {
					const horizontalDistance = Math.abs(event.deltaX);
					const verticalDistance = Math.abs(event.deltaY);
					if (horizontalDistance < 4 || horizontalDistance < verticalDistance * .65) return;
					const delta = event.deltaX;
					if (!Number.isFinite(delta) || delta === 0) return;
					event.preventDefault();
					const now = performance.now();
					if (now - lastWheelAt.current < TEMPLATE_PREVIEW_WHEEL_LOCK_MS) return;
					lastWheelAt.current = now;
					setPage((current) => (current + (delta > 0 ? 1 : -1) + pageCount) % pageCount);
				};
				element.addEventListener("wheel", pageWithWheel, { passive: false });
				return () => {
					element.removeEventListener("wheel", pageWithWheel);
				};
			}, [pageCount]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("article", {
				ref: card,
				className: OfficePptHero_module_css_default.templateCard,
				"data-selected": selected || void 0,
				onMouseEnter: () => {
					hoveredCard.current = true;
					setHovered(true);
				},
				onMouseLeave: () => {
					hoveredCard.current = false;
					setHovered(false);
					setPage(0);
					lastWheelAt.current = Number.NEGATIVE_INFINITY;
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: OfficePptHero_module_css_default.templateSelect,
					"aria-label": template.name,
					"aria-pressed": selected,
					onClick: () => {
						choose(template);
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TemplatePreviewDeck, {
							template,
							page
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: OfficePptHero_module_css_default.templateName,
							children: template.name
						})
					]
				})
			});
		}
		function reducedMotionPreferred() {
			return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		}
		function loadTemplateState(client, timeoutMessage) {
			const controller = new AbortController();
			return new Promise((resolve, reject) => {
				const timer = window.setTimeout(() => {
					controller.abort();
					reject(new Error(timeoutMessage));
				}, TEMPLATE_LOAD_TIMEOUT_MS);
				client.call("state", {}, controller.signal).then((next) => {
					window.clearTimeout(timer);
					resolve(next);
				}, (reason) => {
					window.clearTimeout(timer);
					reject(reason instanceof Error ? reason : new Error(String(reason)));
				});
			});
		}
		function deselectTemplate(client, mode, sessionId, activeMode) {
			mode.setLoading(sessionId, true);
			client.call("template/deselect").then(() => {
				return client.call("presentation/mode", { mode: activeMode });
			}).then(() => {
				mode.deselect(sessionId, activeMode);
			}).catch((reason) => {
				mode.setError(sessionId, reason instanceof Error ? reason.message : String(reason));
			});
		}
		function selectPresentationMode(client, mode, sessionId, activeMode) {
			mode.setMode(sessionId, activeMode);
			client.call("presentation/mode", { mode: activeMode }).catch((reason) => {
				mode.setError(sessionId, reason instanceof Error ? reason.message : String(reason));
			});
		}
		/** Compact selected-template thumbnail inside the resident input card. */
		function OfficePptInputAccessory({ client, mode, sessionId, t }) {
			const state = useMode(mode, sessionId);
			const selected = state.templates.find((template) => template.id === state.selectedId);
			const selectedId = state.activeMode !== null && selected !== void 0 ? selected.id : null;
			const preview = (0, react.useRef)(null);
			const frame = (0, react.useRef)(null);
			const settleTimer = (0, react.useRef)(null);
			const previousId = (0, react.useRef)(selectedId);
			(0, react.useLayoutEffect)(() => {
				if (selectedId === null) {
					if (frame.current !== null) window.cancelAnimationFrame(frame.current);
					if (settleTimer.current !== null) window.clearTimeout(settleTimer.current);
					frame.current = null;
					settleTimer.current = null;
					previousId.current = null;
					return;
				}
				if (previousId.current === selectedId || preview.current === null) return;
				previousId.current = selectedId;
				const element = preview.current;
				const from = frame.current !== null || settleTimer.current !== null ? window.getComputedStyle(element).transform : SELECTED_PREVIEW_ENTRY_TRANSFORM;
				if (frame.current !== null) window.cancelAnimationFrame(frame.current);
				if (settleTimer.current !== null) window.clearTimeout(settleTimer.current);
				frame.current = null;
				settleTimer.current = null;
				element.style.transition = "none";
				element.style.transform = from;
				if (reducedMotionPreferred()) {
					element.style.removeProperty("transition");
					element.style.removeProperty("transform");
					return;
				}
				element.getBoundingClientRect();
				const settle = () => {
					element.style.removeProperty("transition");
					element.style.transform = SELECTED_PREVIEW_REST_TRANSFORM;
					frame.current = null;
					settleTimer.current = window.setTimeout(() => {
						element.style.removeProperty("transform");
						settleTimer.current = null;
					}, SELECTED_PREVIEW_DURATION_MS);
				};
				if (typeof window.requestAnimationFrame === "function") frame.current = window.requestAnimationFrame(settle);
				else settle();
			}, [selectedId]);
			(0, react.useEffect)(() => () => {
				if (frame.current !== null) window.cancelAnimationFrame(frame.current);
				if (settleTimer.current !== null) window.clearTimeout(settleTimer.current);
			}, []);
			if (state.activeMode === null || selected === void 0) return null;
			const activeMode = state.activeMode;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: OfficePptHero_module_css_default.selection,
				"aria-label": `${t("composer.selectedTemplate")}: ${selected.name}`,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					ref: preview,
					className: OfficePptHero_module_css_default.selectionPreview,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: OfficePptHero_module_css_default.selectionFrame,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TemplatePreview, { template: selected })
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: OfficePptHero_module_css_default.selectionRemove,
						"aria-label": t("composer.removeTemplate"),
						onClick: () => {
							deselectTemplate(client, mode, sessionId, activeMode);
						},
						children: "×"
					})]
				})
			});
		}
		/** Selected-template reference shown only while the standard Session is blank. */
		function OfficePptStandardInputAccessory(props) {
			if (!props.session.blank) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(OfficePptInputAccessory, { ...props });
		}
		/** PPT option and template chooser shared by both Composer layouts. */
		function OfficePptChooser({ client, mode, sessionId, t, placement, loadTemplates = true }) {
			const state = useMode(mode, sessionId);
			const modeRootRef = (0, react.useRef)(null);
			const templatePanelRef = (0, react.useRef)(null);
			const templateViewportRef = (0, react.useRef)(null);
			const [category, setCategory] = (0, react.useState)("all");
			(0, react.useEffect)(() => {
				if (!loadTemplates || state.loading || state.templates.length > 0 || state.error !== "") return;
				mode.setLoading(sessionId, true);
				loadTemplateState(client, t("templates.loadTimeout")).then((next) => {
					const activeMode = mode.snapshot(sessionId).activeMode ?? (next.presentationMode === "ppt" ? "ppt" : null);
					mode.setTemplates(sessionId, next.templates);
					if (activeMode === null) return;
					mode.setMode(sessionId, activeMode);
					const selected = next.templates.find((template) => template.id === next.selectedTemplateId && templateSupportsMode(template, "ppt"));
					if (selected === void 0) {
						mode.deselect(sessionId, activeMode);
						return;
					}
					mode.select(sessionId, selected, activeMode);
                    mode.setNotice(sessionId, next.templateMigration?.reason === "template-retired");
				}).catch((reason) => {
					mode.setError(sessionId, reason instanceof Error ? reason.message : String(reason));
				});
			}, [
				client,
				loadTemplates,
				mode,
				sessionId,
				state.error,
				state.loading,
				state.templates.length,
				t
			]);
			const deselect = () => {
				deselectTemplate(client, mode, sessionId, state.activeMode ?? "ppt");
			};
			const select = (template, activeMode = state.activeMode ?? "ppt") => {
				mode.setLoading(sessionId, true);
				client.call("template/select", {
					templateId: template.id,
					mode: activeMode
				}).then(() => {
					mode.select(sessionId, template, activeMode);
				}).catch((reason) => {
					mode.setError(sessionId, reason instanceof Error ? reason.message : String(reason));
				});
			};
			const choose = (template) => {
				if (template.id === state.selectedId) {
					deselect();
					return;
				}
				select(template);
			};
			const togglePpt = () => {
				if (state.activeMode === "ppt") {
					selectPresentationMode(client, mode, sessionId, null);
					return;
				}
				const selected = state.templates.find((template) => template.id === state.selectedId && templateSupportsMode(template, "ppt"));
				if (selected === void 0) {
					if (state.selectedId !== null) {
						deselectTemplate(client, mode, sessionId, "ppt");
						return;
					}
					selectPresentationMode(client, mode, sessionId, "ppt");
					return;
				}
				select(selected, "ppt");
			};
			const modeTemplates = state.templates.filter((template) => templateSupportsMode(template, "ppt"));
			const templateCategories = ["all", ...new Set(modeTemplates.map(templateCategory))];
			const visibleTemplates = modeTemplates.filter((template) => category === "all" || templateCategory(template) === category);
			(0, react.useEffect)(() => {
				if (!templateCategories.includes(category)) setCategory("all");
			}, [category, templateCategories]);
			(0, react.useLayoutEffect)(() => {
				if (placement === "trigger") return;
				const root = modeRootRef.current;
				const panel = templatePanelRef.current;
				if (state.activeMode === null || root === null || panel === null) return;
				const scrollBody = root.closest("[data-conversation-scroll]");
				const composerCard = root.closest("[data-composer-seat]")?.querySelector("[data-composer-card]") ?? null;
				if (scrollBody === null || composerCard === null) return;
				const syncGeometry = () => {
					const scrollRect = scrollBody.getBoundingClientRect();
					const panelRect = panel.getBoundingClientRect();
					const availableHeight = Math.max(TEMPLATE_PANEL_MIN_HEIGHT_PX, Math.floor(scrollRect.bottom - panelRect.top - TEMPLATE_DOCK_BOTTOM_PX));
					root.style.setProperty("--office-ppt-template-panel-height", `${availableHeight}px`);
				};
				const resizeObserver = typeof ResizeObserver === "function" ? new ResizeObserver(syncGeometry) : null;
				resizeObserver?.observe(scrollBody);
				resizeObserver?.observe(composerCard);
				window.addEventListener("resize", syncGeometry);
				const frame = window.requestAnimationFrame(syncGeometry);
				return () => {
					window.cancelAnimationFrame(frame);
					resizeObserver?.disconnect();
					window.removeEventListener("resize", syncGeometry);
					root.style.removeProperty("--office-ppt-template-panel-height");
				};
			}, [placement, state.activeMode]);
			if (placement === "trigger") return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				className: OfficePptHero_module_css_default.modeChip,
				"data-selected": state.activeMode === "ppt" || void 0,
				"aria-expanded": state.activeMode === "ppt",
				onClick: togglePpt,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconBrowseOutline16, { size: 15 }), t("mode.label")]
			});
			if (placement === "fixed" && state.activeMode === null) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				ref: modeRootRef,
				className: OfficePptHero_module_css_default.modeRoot,
				"data-placement": placement,
				"aria-label": t("mode.region"),
				children: [placement === "overlay" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: OfficePptHero_module_css_default.modeRow,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: OfficePptHero_module_css_default.modeChip,
						"data-selected": state.activeMode === "ppt" || void 0,
						"aria-expanded": state.activeMode === "ppt",
						onClick: togglePpt,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconBrowseOutline16, { size: 15 }), t("mode.label")]
					})
				}), state.activeMode !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					ref: templatePanelRef,
					className: OfficePptHero_module_css_default.templatePanel,
					"data-office-ppt-template-panel": "",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: OfficePptHero_module_css_default.templateToolbar,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: OfficePptHero_module_css_default.categoryTabs,
							role: "tablist",
							"aria-label": t("templates.categories"),
							children: templateCategories.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								role: "tab",
								"aria-selected": category === item,
								"data-selected": category === item || void 0,
								onClick: () => {
									setCategory(item);
								},
								children: t(`templates.category.${item}`)
							}, item))
						})
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						ref: templateViewportRef,
						className: OfficePptHero_module_css_default.templateViewport,
						"data-office-ppt-template-viewport": "",
						"data-native-wheel-owner": "",
						children: [state.error !== "" && state.templates.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: OfficePptHero_module_css_default.templateError,
							role: "alert",
							children: state.error
						}), state.loading && state.templates.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: OfficePptHero_module_css_default.panelState,
							children: t("status.loading")
						}) : state.error !== "" && state.templates.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: OfficePptHero_module_css_default.panelState,
							role: "alert",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: state.error }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: OfficePptHero_module_css_default.retryButton,
								onClick: () => {
									mode.setError(sessionId, "");
								},
								children: t("templates.retry")
							})]
						}) : visibleTemplates.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: OfficePptHero_module_css_default.panelState,
							children: t("templates.empty")
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: OfficePptHero_module_css_default.templateGrid,
							children: visibleTemplates.map((template) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TemplateCard, {
								template,
								selected: template.id === state.selectedId,
								choose
							}, template.id))
						})]
					})]
				})]
			});
		}
		/** Standard Composer chooser rendered in normal flow below the resident input card. */
		function OfficePptStandardComposerDock(props) {
			if (!props.session.blank) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(OfficePptChooser, {
				...props,
				placement: "fixed",
				loadTemplates: false
			});
		}
		/** PPT mode control beside the blank-session agent preset. */
		function OfficePptStandardModeAction(props) {
            const state = useMode(props.mode, props.sessionId);
            return (0, react_jsx_runtime.jsxs)(react.Fragment, { children: [
                (0, react_jsx_runtime.jsx)(OfficePptChooser, { ...props, placement: "trigger" }),
                state.notice && state.activeMode !== null ? (0, react_jsx_runtime.jsx)("span", {
                    role: "status", "data-ppt-template-migration": "",
                    style: { fontSize: 11, color: "var(--dsw-alias-label-secondary)", maxWidth: 300 },
                    children: props.t("templates.migrated")
                }) : null
            ] });
        }
		//#endregion
		//#region src/client/locales.ts
		/** Office PPT composer-mode dictionaries. */
		/** Locale namespace. */
		const NS = "dsh-ppt";
		/** Simplified Chinese dictionary. */
		const zh = {
			"mode.label": "PPT",
			"mode.region": "演示文稿模式",
			"composer.selectedTemplate": "已选模板",
			"composer.removeTemplate": "取消选择模板",
			"templates.title": "选择模板",
            "templates.migrated": "原模板已下架，已切换为工程蓝图。已有文件不受影响。",
			"templates.categories": "模板分类",
			"templates.empty": "该分类下还没有模板",
			"templates.loadTimeout": "模板加载超时，请重试",
			"templates.retry": "重新加载模板",
			"templates.category.all": "全部",
			"templates.category.custom": "自定义",
			"templates.category.business": "商务",
			"templates.category.strategy": "策略",
			"templates.category.consulting": "咨询",
			"templates.category.finance": "金融",
			"templates.category.work": "工作",
			"templates.category.promotion": "推广",
			"templates.category.academic": "学术",
			"templates.category.data": "数据",
			"templates.category.editorial": "编辑",
			"templates.category.briefing": "简报",
			"status.loading": "正在处理…",
			"tool.structure": "PPT 结构",
			"tool.structure.open": "查看第 {page} 页：{title}",
			"tool.pages": "页",
			"tool.inspect": "详情",
			"tool.plan": "PPT 规划与校验",
			"tool.plan.story": "叙事",
			"tool.plan.layouts": "种版式",
			"tool.plan.qa": "页面",
			"tool.preview": "PPT 预览",
			"tool.preview.loading": "正在读取最终版本…",
			"tool.preview.failed": "最终版本读取失败",
			"tool.preview.previous": "上一页",
			"tool.preview.next": "下一页",
			"tool.preview.slide": "第 {page} 页，共 {total} 页",
			"tool.preview.retry": "重试",
			"tool.preview.revision": "只读 · 修订版 {revision}",
			"tool.preview.rendering": "正在渲染最终 PPTX…",
			"tool.preview.structure": "内容结构预览",
			"tool.preview.structureOnly": "当前显示内容结构，打开 PPT 可查看最终样式。",
			"tool.preview.structureFailed": "最终 PPTX 渲染失败，当前显示内容结构。",
			"tool.preview.structureLarge": "文件超过在线预览大小上限，当前显示内容结构。",
			"tool.artifact": "PPT 产出物",
			"tool.artifact.saved": "已保存到当前工作区",
			"tool.artifact.fallback": "可编辑演示文稿.pptx",
			"tool.download": "下载 PPTX",
			"tool.openFile": "打开 PPT",
			"tool.openFolder": "在 Finder 中显示",
			"tool.downloading": "正在下载…",
			"tool.openingFile": "正在打开…",
			"tool.openingFolder": "正在打开…",
			"tool.fileActionFailed": "文件操作失败，请重试",
			"tool.create.running": "正在生成 PPT",
			"tool.create.done": "PPT 已生成",
			"tool.create.failed": "PPT 生成失败",
			"tool.update.running": "正在修改第 {page} 页",
			"tool.update.done": "第 {page} 页已更新",
			"tool.update.failed": "第 {page} 页修改失败",
			"tool.update.content": "页面内容已更新"
		};
		/** English dictionary. */
		const en = {
			"mode.label": "PPT",
			"mode.region": "Presentation modes",
			"composer.selectedTemplate": "Selected template",
			"composer.removeTemplate": "Remove selected template",
			"templates.title": "Select template",
            "templates.migrated": "The previous template was retired. Engineering Blueprint is selected; existing files are unchanged.",
			"templates.categories": "Template categories",
			"templates.empty": "No templates in this category",
			"templates.loadTimeout": "Template loading timed out. Try again.",
			"templates.retry": "Reload templates",
			"templates.category.all": "All",
			"templates.category.custom": "Custom",
			"templates.category.business": "Business",
			"templates.category.strategy": "Strategy",
			"templates.category.consulting": "Consulting",
			"templates.category.finance": "Finance",
			"templates.category.work": "Work",
			"templates.category.promotion": "Promotion",
			"templates.category.academic": "Academic",
			"templates.category.data": "Data",
			"templates.category.editorial": "Editorial",
			"templates.category.briefing": "Briefing",
			"status.loading": "Processing…",
			"tool.structure": "Presentation structure",
			"tool.structure.open": "View slide {page}: {title}",
			"tool.pages": "slides",
			"tool.inspect": "Details",
			"tool.plan": "Presentation planning and QA",
			"tool.plan.story": "Story",
			"tool.plan.layouts": "layouts",
			"tool.plan.qa": "Pages",
			"tool.preview": "Presentation preview",
			"tool.preview.loading": "Loading the final revision…",
			"tool.preview.failed": "Could not load the final revision",
			"tool.preview.previous": "Previous slide",
			"tool.preview.next": "Next slide",
			"tool.preview.slide": "Slide {page} of {total}",
			"tool.preview.retry": "Retry",
			"tool.preview.revision": "Read only · Revision {revision}",
			"tool.preview.rendering": "Rendering the final PPTX…",
			"tool.preview.structure": "Content structure preview",
			"tool.preview.structureOnly": "This view shows content structure. Open the PPTX for final styling.",
			"tool.preview.structureFailed": "Final PPTX rendering failed. This view shows content structure.",
			"tool.preview.structureLarge": "This file exceeds the inline preview limit. This view shows content structure.",
			"tool.artifact": "Presentation output",
			"tool.artifact.saved": "Saved in the current workspace",
			"tool.artifact.fallback": "Editable presentation.pptx",
			"tool.download": "Download PPTX",
			"tool.openFile": "Open presentation",
			"tool.openFolder": "Show in Finder",
			"tool.downloading": "Downloading…",
			"tool.openingFile": "Opening…",
			"tool.openingFolder": "Opening…",
			"tool.fileActionFailed": "File action failed. Try again.",
			"tool.create.running": "Generating presentation",
			"tool.create.done": "Presentation generated",
			"tool.create.failed": "Presentation failed",
			"tool.update.running": "Updating slide {page}",
			"tool.update.done": "Slide {page} updated",
			"tool.update.failed": "Slide {page} update failed",
			"tool.update.content": "Slide content updated"
		};
		//#endregion
		//#region src/client/rpc.ts
		/**
		* Bind every request to the active conversation session.
		* @param rpc - Browser Connection RPC client.
		* @param sessionId - Active conversation session.
		* @returns Session-bound Office PPT client.
		*/
		function createOfficePptClient(rpc, sessionId) {
			return { async call(endpoint, payload = {}, signal) {
				const outer = await rpc.call("/dsh-ppt", endpoint, {
					sessionId,
					...payload
				}, signal);
				if (!outer.ok) throw new Error(outer.error.message);
				const raw = outer.value;
				if (raw === null || typeof raw !== "object" || !("status" in raw)) throw new Error("Office PPT returned an invalid response");
				const inner = raw;
				if (inner.status === "error") throw new Error(inner.error.message);
				return inner.data;
			} };
		}
		//#endregion
		//#region src/client/standard.ts
		/** Browser services required by the standard Composer adapter. */
		const standardInject = [
			"slots",
			"locale",
			"connection"
		];
		/** Build the session-scoped browser face shared by both Composer layouts. */
		function officePptHeroInjection(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "dsh-ppt: dictionaries");
			const connection = ctx.get("connection");
			const mode = new OfficePptHeroStore();
			return (sessionId) => ({
				client: createOfficePptClient(connection.rpc, sessionId),
				mode
			});
		}
		/**
		* Register the PPT chooser on the cross-version standard Composer seats.
		* @param ctx - Browser context that owns the standard Composer slots.
		*/
		function applyStandard(ctx) {
			const injectHero = officePptHeroInjection(ctx);
			ctx.slots.inject("conversation.hero.modeActions", () => ctx.slots.register({
				name: "conversation.hero.modeActions",
				id: "dsh-ppt",
				order: 20,
				locale: NS,
				inject: injectHero
			}, OfficePptStandardModeAction));
			ctx.slots.inject("conversation.input.accessory", () => ctx.slots.register({
				name: "conversation.input.accessory",
				id: "dsh-ppt",
				order: 20,
				locale: NS,
				inject: injectHero
			}, OfficePptStandardInputAccessory));
			ctx.slots.inject("conversation.composer.dock", () => ctx.slots.register({
				name: "conversation.composer.dock",
				id: "dsh-ppt",
				order: 20,
				locale: NS,
				inject: injectHero
			}, OfficePptStandardComposerDock));
		}
		//#endregion
		exports.OfficePptHeroStore = OfficePptHeroStore;
		exports.OfficePptStandardComposerDock = OfficePptStandardComposerDock;
		exports.OfficePptStandardInputAccessory = OfficePptStandardInputAccessory;
		exports.OfficePptStandardModeAction = OfficePptStandardModeAction;
		exports.apply = applyStandard;
		exports.inject = standardInject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map