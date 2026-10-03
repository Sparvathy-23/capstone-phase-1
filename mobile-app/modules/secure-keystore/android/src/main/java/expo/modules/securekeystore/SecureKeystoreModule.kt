package expo.modules.securekeystore

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.security.KeyPair
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.PrivateKey
import java.security.Signature
import java.security.spec.ECGenParameterSpec

private const val KEYSTORE_PROVIDER = "AndroidKeyStore"
private const val KEY_ALIAS = "secure_capture_signing_key"

// Person 4: Android Keystore key generation + digital signing.
// Signs a hash the caller already computed (Person 3's SHA-256), using
// NONEwithECDSA so we don't hash the hash a second time.
class SecureKeystoreModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("SecureKeystore")

    AsyncFunction("getOrCreatePublicKey") {
      Base64.encodeToString(getOrCreateKeyPair().public.encoded, Base64.NO_WRAP)
    }

    AsyncFunction("signHash") { hashHex: String ->
      val privateKey = getOrCreateKeyPair().private as PrivateKey
      val signature = Signature.getInstance("NONEwithECDSA").apply {
        initSign(privateKey)
        update(hexToBytes(hashHex))
      }
      Base64.encodeToString(signature.sign(), Base64.NO_WRAP)
    }
  }

  private fun getOrCreateKeyPair(): KeyPair {
    val keyStore = KeyStore.getInstance(KEYSTORE_PROVIDER).apply { load(null) }

    if (!keyStore.containsAlias(KEY_ALIAS)) {
      val generator = KeyPairGenerator.getInstance(
        KeyProperties.KEY_ALGORITHM_EC,
        KEYSTORE_PROVIDER
      )
      val spec = KeyGenParameterSpec.Builder(KEY_ALIAS, KeyProperties.PURPOSE_SIGN)
        .setDigests(KeyProperties.DIGEST_NONE, KeyProperties.DIGEST_SHA256)
        .setAlgorithmParameterSpec(ECGenParameterSpec("secp256r1"))
        .build()
      generator.initialize(spec)
      generator.generateKeyPair()
    }

    val publicKey = keyStore.getCertificate(KEY_ALIAS).publicKey
    val privateKey = keyStore.getKey(KEY_ALIAS, null) as PrivateKey
    return KeyPair(publicKey, privateKey)
  }

  private fun hexToBytes(hex: String): ByteArray {
    val clean = if (hex.length % 2 != 0) "0$hex" else hex
    return ByteArray(clean.length / 2) { i ->
      ((Character.digit(clean[i * 2], 16) shl 4) + Character.digit(clean[i * 2 + 1], 16)).toByte()
    }
  }
}
