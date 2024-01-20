// We use the files here to separate our queries from our business logics 
// SO that a sthe queries get bigger it wont affect our business logics

const getTalenters = "SELECT * FROM thub_users";
const getTalenterById = "SELECT * FROM thub_users WHERE id = ? ";
const getUserLogin = "SELECT * FROM thub_users WHERE LOWER(email) = ? ";
//const getUserLogin = "SELECT usocialid, email, password, profileupdate, status FROM thub_users WHERE LOWER(email) = ? ";
//const getUserLogin = "SELECT usocialid, email, password, profileupdate, status FROM thub_users WHERE LOWER(email) = ? and status = 1";
const checkEmailExists = "SELECT email FROM thub_users where email = ?";
const addTalenter = "INSERT IGNORE INTO thub_users (usocialid, email, password, email_verification_link) VALUES (?, ?, ?, ?)";
const removeTalenter = "DELETE FROM thub_users WHERE id = ?";
const updateTalenterName = "UPDATE thub_users SET fullname = ? WHERE id = ?";
const updateLastLogin = "UPDATE thub_users SET last_login = now() WHERE usocialid = ? ";
const checkActivateEmail = "SELECT email FROM thub_users WHERE email = ? and status= 0 ";
const checkActivateStatus = "SELECT email_verification_link FROM thub_users WHERE email_verification_link = ? and status= 0 ";
const activateSignup = "UPDATE thub_users SET status='1', email_verified_at = now() WHERE email_verification_link = ? and status = '0' ";
const activateEmail = "UPDATE thub_users SET status='1', email_verified_at = now() WHERE email = ? and status = '0' ";
const instanceOTP = "INSERT INTO otp (otp, expiration_time) VALUES (?,?) ";
const findInstancteOTPID = "SELECT * FROM otp WHERE id = ? ";
const activateOTP = "UPDATE otp SET verified = 1 WHERE id = ? ";
const activateUserWithOTP = "UPDATE thub_users SET status='1', email_verified_at = now() WHERE email = ? and status = '0' ";
const loadlasttenOTP = "SELECT * FROM otp order by id DESC limit 0, 10 ";
const loadALLOTP = "SELECT * FROM otp order by id DESC ";
const getOTPByID = "SELECT * FROM otp WHERE id = ? ";
const deleteOTP = "DELETE FROM otp WHERE id = ?";
const getpreUserbyEmail = "SELECT email FROM thub_users WHERE email = ? ";
const checkProfile = "SELECT * FROM hub_profile where email = ? ";
const updateProfile = "UPDATE hub_profilee SET firstname = ? , lastname = ? , mobile = ?, gender = ?, date_of_birth = ?, skillset = ?, height = ?, bodytype = ?, complexion = ?, state = ?, city = ?, state_of_origin = ? , privacy = ?, hasRegistered = 1, status = 1 WHERE  email = ? " ;
const updateResetPassword = "UPDATE thub_users set passwordreset = ?, changepassword=1  WHERE email= ? ";
const updatepassword = "UPDATE thub_users SET passwordreset='', changepassword=0, password = ? WHERE email=? ";

// const initProfile = "INSERT IGNORE INTO hub_profile (firstName, lastName, gender, dateofbirth, email, status) VALUES (' ',' ',' ',' ', ? , 0) ";


//Exports them all as Object
module.exports = {
    getTalenters,
    getTalenterById,
    checkEmailExists,
    addTalenter,
    removeTalenter,
    updateTalenterName,
    getUserLogin,
    updateLastLogin,
    checkActivateEmail,
    activateEmail,
    checkActivateStatus,
    activateSignup,
    instanceOTP,
    findInstancteOTPID,
    activateOTP,
    activateUserWithOTP,
    loadlasttenOTP,
    loadALLOTP,
    getOTPByID,
    deleteOTP,
    getpreUserbyEmail,
    checkProfile,
    updateProfile,
    updateResetPassword,
    updatepassword
}