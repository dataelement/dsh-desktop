/** ACL/token-specific Win32 constants. */
/** OpenProcess access required to query the current process token. */
export declare const PROCESS_QUERY_INFORMATION = 1024;
/** Token right required by CreateProcessAsUserW. */
export declare const TOKEN_ASSIGN_PRIMARY = 1;
/** Token right required by DuplicateTokenEx. */
export declare const TOKEN_DUPLICATE = 2;
/** Token right required to read token information. */
export declare const TOKEN_QUERY = 8;
/** Token right required to replace the token default DACL. */
export declare const TOKEN_ADJUST_DEFAULT = 128;
/** Group attribute identifying the token logon SID. */
export declare const SE_GROUP_LOGON_ID = 3221225472;
/** Standard-rights portion excluded from the write capability grant. */
export declare const STANDARD_RIGHTS_WRITE = 131072;
/** Generic file write access bits. */
export declare const FILE_GENERIC_WRITE = 1179926;
/** Delete or rename an object. */
export declare const DELETE = 65536;
/** Delete or rename a directory child. */
export declare const FILE_DELETE_CHILD = 64;
/**
 * Capability-SID access mask granting write, delete, and child deletion.
 * WRITE_DAC and WRITE_OWNER stay excluded so a confined child cannot rewrite
 * DACLs or take ownership to escape the allowlist.
 */
export declare const GRANT_MASK: number;
/** Full access used in the restricted token default DACL. */
export declare const FILE_ALL_ACCESS = 2032127;
/** CreateRestrictedToken flag that disables maximum privileges. */
export declare const DISABLE_MAX_PRIVILEGE = 1;
/** CreateRestrictedToken limited-user flag. */
export declare const LUA_TOKEN = 4;
/** Restrict write access to the listed restricting SIDs. */
export declare const WRITE_RESTRICTED = 8;
/** WELL_KNOWN_SID_TYPE value for Everyone. */
export declare const WinWorldSid = 1;
/** TOKEN_INFORMATION_CLASS value for token groups. */
export declare const TokenGroups = 2;
/** TOKEN_INFORMATION_CLASS value for the token default DACL. */
export declare const TokenDefaultDacl = 6;
/** SECURITY_INFORMATION flag selecting the DACL. */
export declare const DACL_SECURITY_INFORMATION = 4;
/** SE_OBJECT_TYPE value for filesystem objects. */
export declare const SE_FILE_OBJECT = 1;
/** TRUSTEE_TYPE value used when trustee classification is unknown. */
export declare const TRUSTEE_IS_UNKNOWN = 0;
/** TRUSTEE_FORM value indicating a SID pointer. */
export declare const TRUSTEE_IS_SID = 0;
/** Trustee record has no chained trustee. */
export declare const NO_MULTIPLE_TRUSTEE = 0;
/** EXPLICIT_ACCESS mode that grants access. */
export declare const GRANT_ACCESS = 1;
/** EXPLICIT_ACCESS mode that revokes access. */
export declare const REVOKE_ACCESS = 4;
/** ACE inheritance flags for child containers and objects. */
export declare const SUB_CONTAINERS_AND_OBJECTS_INHERIT = 3;
/** Legacy Win32 maximum path character count used by GetTempPathW. */
export declare const MAX_PATH = 260;
/** Successful Win32 status code. */
export declare const ERROR_SUCCESS = 0;
/** Win32 error reported when an immediate byte-range lock cannot be obtained. */
export declare const ERROR_LOCK_VIOLATION = 33;
/** Generic read access bit. */
export declare const GENERIC_READ = 2147483648;
/** Generic write access bit. */
export declare const GENERIC_WRITE = 1073741824;
/** CreateFile share-read flag. */
export declare const FILE_SHARE_READ = 1;
/** CreateFile share-write flag. */
export declare const FILE_SHARE_WRITE = 2;
/** CreateFile share-delete flag. */
export declare const FILE_SHARE_DELETE = 4;
/** CreateFile disposition that opens or creates the file. */
export declare const OPEN_ALWAYS = 4;
/** LockFileEx exclusive-lock flag. */
export declare const LOCKFILE_EXCLUSIVE_LOCK = 2;
/** LockFileEx immediate-failure flag. */
export declare const LOCKFILE_FAIL_IMMEDIATELY = 1;
/** ACE type for an allowed-access entry. */
export declare const ACCESS_ALLOWED_ACE_TYPE = 0;
/** Maximum SID sub-authority count. */
export declare const SID_MAX_SUB_AUTHORITIES = 15;
/** ACE flag marking inherited entries. */
export declare const INHERITED_ACE = 16;
/** Maximum SID allocation size in bytes. */
export declare const SECURITY_MAX_SID_SIZE = 68;
/** x64 SID_AND_ATTRIBUTES byte size. */
export declare const SID_AND_ATTRIBUTES_SIZE = 16;
/** x64 TOKEN_GROUPS offset of the first group entry. */
export declare const TOKEN_GROUPS_OFFSET = 8;
/** x64 EXPLICIT_ACCESS_W byte size. */
export declare const EXPLICIT_ACCESS_W_SIZE = 48;
/** x64 offset of TRUSTEE_W inside EXPLICIT_ACCESS_W. */
export declare const TRUSTEE_W_OFFSET = 16;
/** x64 offset of ptstrName inside TRUSTEE_W. */
export declare const TRUSTEE_W_PTSTRNAME_OFFSET = 24;
//# sourceMappingURL=win32-abi.d.ts.map