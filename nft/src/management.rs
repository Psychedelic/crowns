use ic_kit::{candid::CandidType, ic, Principal};
use serde::Deserialize;
use crate::types::*;
use ic_kit::macros::*;

#[derive(CandidType, Deserialize)]
pub struct Fleek(pub Vec<Principal>);

impl Default for Fleek {
    fn default() -> Self {
        panic!()
    }
}

pub fn is_fleek(account: &Principal) -> bool {
    ic::get::<Fleek>().0.contains(account)
}

#[update(name = "add_admin")]
async fn add_admin(new_admin: Principal) -> Result<(), ApiError> {
    if !is_fleek(&ic::caller()) {
        return Err(ApiError::Unauthorized);
    }
    ic::get_mut::<Fleek>().0.push(new_admin);
    Ok(())
}
