pragma circom 2.1.6;

include "../crescent-credentials/circuit_setup/circuits-mdl/nope/crypto/ECDSA.circom";

template VerifySignature(max_msg_bytes) {
    signal input message[max_msg_bytes];
    signal input pubkey[64];
    signal input sig[6254];
    signal input message_bytes; // actual length of the message without the padding

    // *********** verify signature for the message ***********    
    // unpack sig
    component UnpackSig = ECDSAP256SHA256SigUnpack();
    UnpackSig.sig <== sig;

    // check ECDSA sig
    component VerifySig = ECDSAP256SHA256Verify(max_msg_bytes);    
    VerifySig.sig_s_inv <== UnpackSig.sig_s_inv;
    VerifySig.sig_rx <== UnpackSig.sig_rx;
    VerifySig.sig_ry <== UnpackSig.sig_ry;
    VerifySig.u <== UnpackSig.u;
    VerifySig.u2sign <== UnpackSig.u2sign;
    VerifySig.AUX <== UnpackSig.AUX;
    VerifySig.addres_x <== UnpackSig.addres_x;
    VerifySig.addres_y <== UnpackSig.addres_y;
    VerifySig.addadva <== UnpackSig.addadva;
    VerifySig.addadvb <== UnpackSig.addadvb;

    VerifySig.real_msg_byte_len <== message_bytes;
    VerifySig.msg <== message;
    VerifySig.key <== pubkey;
}

// template Main(max_msg_bytes, field_byte_len) {

//     signal input message[max_msg_bytes];
//     signal input pubkey[64];
//     signal input pubkey_hash;   // SHA-256(pubkey), truncated to 248 bits
//     signal input sig[6254];
//     signal input message_bytes; // actual length of the message without the padding

//     // *********** Ensure that SHA256(pubkey) == pubkey_hash ***********
//     // ** pubkey is a private input, pubkey_hash is a public input that will also be input by the verifier
//     log("Checking public key");
//     component sha2 = SHA256(64);
//     sha2.msg <== pubkey;
//     sha2.real_byte_len <== 64;

//     // Convert digest bytes to field element
//     component bytes_to_field = BytesToField(31);
//     for(var i = 0; i < 31; i++) {
//         bytes_to_field.bytes[i] <== sha2.hash[i];
//     }
//     log("Computed public key digest as field element: ", bytes_to_field.field_element);

//     log("Input pubkey_hash : ", pubkey_hash);
//     bytes_to_field.field_element === pubkey_hash;

//     // #################### Prove validUntil date ####################
//     signal valid_until_prefix[13] <== [106, 118, 97, 108, 105, 100, 85, 110, 116, 105, 108, 192, 116];
//     signal input valid_until_prefix_l;
//     signal input valid_until_prefix_r;
//     signal input valid_until_value;    // TODO: extract from message, using MatchClaim component?

//     // First we make sure that valid_until_prefix appears in message[l:r]
//     component prefix_indicator = IntervalIndicator(max_msg_bytes);
//     prefix_indicator.l <== valid_until_prefix_l;
//     prefix_indicator.r <== valid_until_prefix_r;

//     component match_prefix = MatchSubstring(max_msg_bytes, 13, 13);
//     match_prefix.msg <== message;
//     match_prefix.substr <== valid_until_prefix;
//     match_prefix.range_indicator <== prefix_indicator.indicator;
//     match_prefix.l <== valid_until_prefix_l;
//     match_prefix.r <== valid_until_prefix_r;

//     // Next we get the timestamp from the following twenty bytes

//     // Use a prover-only function to compute the bytes
//     var timestamp_len = 20;
//     signal valid_until_bytes[timestamp_len];
//     component value_indicator = IntervalIndicator(max_msg_bytes);
//     value_indicator.l <== valid_until_prefix_l + 13;
//     value_indicator.r <== value_indicator.l + timestamp_len;

//     var tmp;
//     log("Bytes of timestamp:");
//     for (var i = 0; i < timestamp_len; i++) {
//         var c = 0;
//         for (var j = i; j < max_msg_bytes; j++) {
//             tmp = value_indicator.start_indicator[j - i] * value_indicator.indicator[j];
//             c +=  tmp * message[j];
//         }
//         valid_until_bytes[i] <-- c;
//         log(c);
//     }
//     // Use MatchSubstring to *prove* these valid_until_bytes are found following the prefix
//     component match_value = MatchSubstring(max_msg_bytes, timestamp_len, timestamp_len);
//     match_value.msg <== message;
//     match_value.substr <== valid_until_bytes;
//     match_value.range_indicator <== value_indicator.indicator;
//     match_value.l <== value_indicator.l;
//     match_value.r <== value_indicator.r;

//     // Parse out the year, month and day from the timestamp (ISO 8061 format, e.g., 2027-01-02T00:00:00Z )
//     signal d[timestamp_len] <== valid_until_bytes;
//     signal year <== (d[0]-48)*1000 + (d[1]-48)*100 + (d[2]-48)*10 + (d[3]-48);
//     signal month <== (d[5]-48)*10 + (d[6]-48); 
//     signal day <== (d[8]-48)*10 + (d[9]-48);

//     log("validUntil date: ", year,"-",month,"-",day);

//     component ts = UnixTimestamp();
//     ts.year <== year;
//     ts.month <== month;
//     ts.day <== day;
//     log("ts.output = ", ts.out);
    
//     ts.out === valid_until_value;    // Constrain the input to the value extracted from the cred

//     // ############ Extract the device key from the credential
//     // Strategy: 
//     //      - prover provides the x-coordinate as circuit input (32-bytes)
//     //      - The circuit ensures that the x-coord follows a public prefix
//     //      - the position of the prefix will be hidden (to prevents a malicious issuer from linking users by uniquely padding other data)
//     //      - the circuit will split the 32 bytes into two 16-byte pieces, encode as field elements, then output both pieces
//     //Prefix: 6d6465766963654b6579496e666fa1696465766963654b6579a401022001215820
//     signal device_key_x_prefix[33] <== [109, 100, 101, 118, 105, 99, 101, 75, 101, 121, 73, 110, 102, 111, 161, 105, 100, 101, 118, 105, 99, 101, 75, 101, 121, 164, 1, 2, 32, 1, 33, 88, 32];
//     signal input device_key_x[32]; 

//     // Match the prefix||key in the credential to prove device_key_x is correct
//     signal input device_key_x_prefix_l;
//     signal input device_key_x_prefix_r;

//     // Create a new array to hold the concatenated result
//     signal device_key_x_with_prefix[65]; // 33 bytes prefix + 32 bytes key
//     for (var i = 0; i < 33; i++) {
//         device_key_x_with_prefix[i] <== device_key_x_prefix[i];
//     }
//     for (var i = 0; i < 32; i++) {
//         device_key_x_with_prefix[33 + i] <== device_key_x[i];
//     }

//     log("Matching device_key_with_prefix");
//     component device_key_x_with_prefix_indicator = IntervalIndicator(max_msg_bytes);
//     device_key_x_with_prefix_indicator.l <== device_key_x_prefix_l;
//     device_key_x_with_prefix_indicator.r <== device_key_x_prefix_r + 32;  

//     component match_device_key_x_with_prefix = MatchSubstring(max_msg_bytes, 65, 31);
//     match_device_key_x_with_prefix.msg <== message;
//     match_device_key_x_with_prefix.substr <== device_key_x_with_prefix;
//     match_device_key_x_with_prefix.range_indicator <== device_key_x_with_prefix_indicator.indicator;
//     match_device_key_x_with_prefix.l <== device_key_x_prefix_l;
//     match_device_key_x_with_prefix.r <== device_key_x_prefix_r + 32;

//     // Now that device_key_x is authenticated, we can split it into the two output values
//     log("Splitting key into two parts");
//     signal device_key_x_rev[32];        // Reverse; big endian to little
//     for(var i = 0; i < 32; i++) {
//         device_key_x_rev[i] <== device_key_x[31-i];
//     }

//     // Note: in the prover inputs file device_key_0_value and device_key_1_value must be quoted, 
//     // otherwise there is an overflow issue causing the input value to be mangled.
//     signal input device_key_0_value;    
//     signal device_key_0[16];
//     device_key_0[0] <== device_key_x_rev[0];
//     var pow256 = 256;
//     for(var i = 1; i < 16; i++) {
//         device_key_0[i] <== device_key_0[i-1] + device_key_x_rev[i] * pow256;
//         pow256 = pow256*256;
//     }
//     device_key_0[15] === device_key_0_value;

//     signal input device_key_1_value;
//     signal device_key_1[16];
//     device_key_1[0] <== device_key_x_rev[16];
//     pow256 = 256;
//     for(var i = 1; i < 16; i++) {
//         device_key_1[i] <== device_key_1[i-1] + device_key_x_rev[16 + i] * pow256;
//         pow256 = pow256*256;
//     }
//     device_key_1[15] === device_key_1_value;
// }